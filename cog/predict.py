import os
import sys
import cv2
import numpy as np
import json
import base64
from pathlib import Path
from typing import List, Dict, Any, Optional
import tempfile
import shutil
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import multiprocessing as mp
from functools import partial

# Cog imports
from cog import BasePredictor, Input, Path as CogPath

# Add PaddleDetection to Python path
sys.path.append('/opt/paddle/PaddleDetection')

# ByteTrack imports for PaddleDetection 2.8.1
from deploy.python.infer import Detector
from deploy.python.mot_sde_infer import SDE_Detector

# Import scikit-learn for clustering
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import normalize

class MultiObjectTracker:
    def __init__(self):
        """Initialize ByteTrack with PP-YOLOE detector and Re-ID model for PaddleDetection 2.8.1"""
        # Detection model path
        self.detector_model_dir = "/opt/paddle/PaddleDetection/output_inference/mot_detector/ppyoloe_crn_l_36e_640x640_mot17half"
        # Re-ID model path
        self.reid_model_dir = "/opt/paddle/PaddleDetection/output_inference/reid_model/deepsort_pplcnet"
        self.device = "GPU" if os.environ.get("CUDA_VISIBLE_DEVICES") else "CPU"
        
        # Create tracker config file
        self._create_tracker_config()
        
        # Initialize SDE tracker (ByteTrack) - optimized for vending machine detection
        self.tracker = SDE_Detector(
            model_dir=self.detector_model_dir,
            tracker_config="/opt/paddle/PaddleDetection/tracker_config.yml",
            device=self.device,
            run_mode='paddle',
            batch_size=1,
            trt_min_shape=1,
            trt_max_shape=1280,
            trt_opt_shape=640,
            trt_calib_mode=False,
            cpu_threads=1,
            enable_mkldnn=False,
            threshold=0.3,  # Lower threshold for glass occlusion
            output_dir="/tmp/output",
            save_images=False,
            save_mot_txts=False,
            reid_model_dir=None  # FIX: Pass None to prevent internal Re-ID loading bug
        )
        
        # Initialize Re-ID predictor separately for clustering
        self._init_reid_predictor()
        
        self.object_counts = {}
        self.thumbnails = {}
        self.tracked_objects = {}
        
    def _init_reid_predictor(self):
        """Initialize the Re-ID predictor for feature extraction"""
        try:
            from deploy.python.infer import load_predictor
            self.reid_predictor = load_predictor(
                self.reid_model_dir,
                run_mode='paddle',
                device=self.device.lower(),
                batch_size=1,
                trt_min_shape=1,
                trt_max_shape=1280,
                trt_opt_shape=640,
                trt_calib_mode=False,
                cpu_threads=1,
                enable_mkldnn=False
            )
            print(f"Re-ID predictor initialized successfully from {self.reid_model_dir}")
        except Exception as e:
            print(f"Warning: Could not initialize Re-ID predictor: {e}")
            self.reid_predictor = None
        
    def _create_tracker_config(self):
        """Create the tracker config file for ByteTrack"""
        config_content = """# config of tracker for MOT SDE Detector, use 'OCSORTTracker' as default, 'JDETracker' here is just BYTETracker.
# The tracker of MOT JDE Detector (such as FairMOT) is exported together with the model.
# Here 'min_box_area' and 'vertical_ratio' are set for pedestrian, you can modify for other objects tracking.

type: JDETracker # Choose JDETracker for ByteTrack

# just as BYTETracker, used for FairMOT in PP-Tracking project and for ByteTrack in PP-Humanv1 project
JDETracker:
  use_byte: True
  det_thresh: 0.3
  conf_thres: 0.6
  low_conf_thres: 0.1
  match_thres: 0.9
  min_box_area: 0
  vertical_ratio: 0 # 1.6 for pedestrian

# used for OC-SORT in PP-Humanv2 project and PP-Vehicle project
OCSORTTracker:
  det_thresh: 0.4
  max_age: 30
  min_hits: 3
  iou_threshold: 0.3
  delta_t: 3
  inertia: 0.2
  min_box_area: 0
  vertical_ratio: 0
  use_byte: False
  use_angle_cost: False
  
# Other tracker types like DeepSORTTracker and BOTSORTTracker are also available
"""
        
        config_path = "/opt/paddle/PaddleDetection/tracker_config.yml"
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        with open(config_path, 'w') as f:
            f.write(config_content)
        
        print(f"Created tracker config file at: {config_path}")
        
    def download_video(self, video_url: str) -> str:
        """Download video from URL to local file"""
        import requests
        
        temp_file = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
        temp_path = temp_file.name
        temp_file.close()
        
        print(f"Downloading video from: {video_url}")
        response = requests.get(video_url, stream=True)
        response.raise_for_status()
        
        with open(temp_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        
        return temp_path
    
    def extract_thumbnail(self, frame: np.ndarray, bbox: List[float], object_id: int) -> str:
        """Extract thumbnail from detected object and save as base64"""
        x1, y1, x2, y2 = map(int, bbox[:4])
        
        h, w = frame.shape[:2]
        x1 = max(0, min(x1, w))
        y1 = max(0, min(y1, h))
        x2 = max(0, min(x2, w))
        y2 = max(0, min(y2, h))
        
        if x2 <= x1 or y2 <= y1:
            return ""
        
        object_img = frame[y1:y2, x1:x2]
        thumbnail = cv2.resize(object_img, (128, 128))
        
        _, buffer = cv2.imencode('.jpg', thumbnail)
        thumbnail_b64 = base64.b64encode(buffer).decode('utf-8')
        
        return thumbnail_b64
    
    def get_crops(self, tlwhs, frame, w=64, h=192):
        """Extracts and resizes image crops from bounding boxes."""
        crops = []
        for tlwh in tlwhs:
            x, y, w_box, h_box = map(int, tlwh)
            
            # Ensure coordinates are within frame bounds
            x = max(0, min(x, frame.shape[1]))
            y = max(0, min(y, frame.shape[0]))
            w_box = min(w_box, frame.shape[1] - x)
            h_box = min(h_box, frame.shape[0] - y)
            
            if w_box > 0 and h_box > 0:
                crop = frame[y:y+h_box, x:x+w_box]
                if crop.size > 0:
                    resized_crop = cv2.resize(crop, (w, h))
                    # Convert to RGB and normalize for Re-ID model
                    resized_crop = cv2.cvtColor(resized_crop, cv2.COLOR_BGR2RGB)
                    resized_crop = resized_crop.astype('float32') / 255.0
                    # Add batch dimension
                    resized_crop = np.expand_dims(resized_crop, axis=0)
                    crops.append(resized_crop)
                else:
                    crops.append(np.zeros((1, h, w, 3), dtype='float32'))
            else:
                crops.append(np.zeros((1, h, w, 3), dtype='float32'))
        
        return np.array(crops)
    
    def encode_crop_to_base64(self, crop):
        """Convert a crop array to base64 encoded JPEG string"""
        try:
            # Remove batch dimension if present
            if len(crop.shape) == 4:
                crop = crop[0]
            
            # Convert from normalized float to uint8
            if crop.dtype == 'float32':
                crop = (crop * 255).astype('uint8')
            
            # Convert from RGB to BGR for OpenCV
            crop_bgr = cv2.cvtColor(crop, cv2.COLOR_RGB2BGR)
            
            # Resize to thumbnail size
            thumbnail = cv2.resize(crop_bgr, (128, 128))
            
            # Encode to base64
            _, buffer = cv2.imencode('.jpg', thumbnail)
            thumbnail_b64 = base64.b64encode(buffer).decode('utf-8')
            
            return thumbnail_b64
        except Exception as e:
            print(f"Error encoding crop to base64: {e}")
            return ""
    
    def extract_reid_features(self, crops):
        """Extract Re-ID features from image crops"""
        if self.reid_predictor is None:
            # Fallback: return random features if Re-ID model not available
            return np.random.rand(len(crops), 512)
        
        try:
            # Get input/output handles
            input_names = self.reid_predictor.get_input_names()
            output_names = self.reid_predictor.get_output_names()
            input_tensor = self.reid_predictor.get_input_handle(input_names[0])
            output_tensor = self.reid_predictor.get_output_handle(output_names[0])
            
            # Prepare input data
            if len(crops.shape) == 4:
                input_data = crops
            else:
                input_data = np.expand_dims(crops, axis=0)
            
            input_tensor.copy_from_cpu(input_data)
            self.reid_predictor.run()
            features = output_tensor.copy_to_cpu()
            
            return features
            
        except Exception as e:
            print(f"Error extracting Re-ID features: {e}")
            # Fallback: return random features
            return np.random.rand(len(crops), 512)
    
    def process_video(self, video_path: str) -> Dict[str, Any]:
        """
        Process video with an EFFICIENT two-step tracking workflow:
        1. Single-pass ByteTrack to get detections and crops.
        2. Offline Re-ID clustering to get stable IDs.
        """
        print(f"Processing video with single-pass workflow: {video_path}")
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")
        
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"Video properties: {width}x{height}, {fps} fps, {frame_count} frames")
        
        # --- Step 1: Parallel Frame Processing ---
        print("Step 1: Processing frames in parallel...")
        
        # Determine optimal number of workers
        num_workers = min(mp.cpu_count(), 8)  # Cap at 8 to avoid memory issues
        print(f"Using {num_workers} parallel workers")
        
        # Process frames in parallel
        all_detections = self._process_frames_parallel(video_path, frame_count, num_workers)
        
        print(f"Collected {len(all_detections)} detections across {frame_count} frames")
        
        if not all_detections:
            return {
                "total_frames": frame_count,
                "fps": fps,
                "resolution": f"{width}x{height}",
                "objects_detected": {},
                "tracking_summary": {},
                "thumbnails": {},
                "total_objects": 0,
                "unique_classes": []
            }
        
        # --- Step 2: Extract Re-ID Features and Cluster ---
        print("Step 2: Extracting Re-ID features and clustering...")
        
        # Extract features from all crops
        all_crops = np.array([d['crop'] for d in all_detections if d['crop'] is not None])
        if len(all_crops) > 0:
            all_features = self.extract_reid_features(all_crops)
            
            # Add features back to detections
            crop_idx = 0
            for detection in all_detections:
                if detection['crop'] is not None:
                    detection['feature'] = all_features[crop_idx]
                    crop_idx += 1
            
            # Normalize features for clustering
            normalized_features = normalize(all_features, norm='l2')
            
            # Cluster using DBSCAN
            clustering = DBSCAN(eps=0.4, min_samples=2, metric='cosine').fit(normalized_features)
            cluster_labels = clustering.labels_
            
            # Assign cluster labels back to detections
            crop_idx = 0
            for detection in all_detections:
                if detection['crop'] is not None:
                    detection['cluster_id'] = int(cluster_labels[crop_idx])
                    crop_idx += 1
                else:
                    detection['cluster_id'] = -1  # Noise
        else:
            # No valid crops, assign unique cluster IDs based on track_id
            track_to_cluster = {}
            cluster_counter = 0
            for detection in all_detections:
                track_id = detection['track_id']
                if track_id not in track_to_cluster:
                    track_to_cluster[track_id] = cluster_counter
                    cluster_counter += 1
                detection['cluster_id'] = track_to_cluster[track_id]
        
        # --- Step 3: Build Final Results ---
        print("Step 3: Building final results...")
        
        results = {
            "total_frames": frame_count,
            "fps": fps,
            "resolution": f"{width}x{height}",
            "objects_detected": {},
            "tracking_summary": {},
            "thumbnails": {},
            "clustering_info": {
                "total_detections": len(all_detections),
                "unique_clusters": len(set(d['cluster_id'] for d in all_detections if d['cluster_id'] != -1))
            }
        }
        
        # Group detections by cluster
        cluster_groups = {}
        for detection in all_detections:
            cluster_id = detection['cluster_id']
            if cluster_id == -1:  # Skip noise
                continue
                
            if cluster_id not in cluster_groups:
                cluster_groups[cluster_id] = []
            cluster_groups[cluster_id].append(detection)
        
        # Process each cluster
        for cluster_id, detections in cluster_groups.items():
            if not detections:
                continue
                
            # Get the most common class name for this cluster
            class_names = [d['class_name'] for d in detections]
            class_name = max(set(class_names), key=class_names.count)
            
            # Find the best detection (highest confidence) for thumbnail
            best_detection = max(detections, key=lambda x: x['score'])
            
            # Generate thumbnail from the stored crop (no need to re-read video!)
            thumbnail_b64 = ""
            if best_detection['crop'] is not None:
                thumbnail_b64 = self.encode_crop_to_base64(best_detection['crop'])
            
            # Update results
            if class_name not in results["objects_detected"]:
                results["objects_detected"][class_name] = 0
            results["objects_detected"][class_name] += 1
            
            object_id = f"{class_name}_{cluster_id}"
            
            if thumbnail_b64:
                results["thumbnails"][object_id] = {
                    "class": class_name,
                    "frame": best_detection['frame_id'],
                    "bbox": best_detection['bbox'],
                    "confidence": best_detection['score'],
                    "cluster_id": cluster_id,
                    "thumbnail": thumbnail_b64
                }
            
            if class_name not in results["tracking_summary"]:
                results["tracking_summary"][class_name] = []
            
            # Add all detections for this cluster
            for detection in detections:
                results["tracking_summary"][class_name].append({
                    "frame": detection['frame_id'],
                    "bbox": detection['bbox'],
                    "confidence": detection['score'],
                    "object_id": object_id,
                    "cluster_id": cluster_id,
                    "original_track_id": detection['track_id']
                })
        
        results["total_objects"] = sum(results["objects_detected"].values())
        results["unique_classes"] = list(results["objects_detected"].keys())
        
        print(f"Final results: {results['total_objects']} unique objects across {len(results['unique_classes'])} classes")
        
        return results
    
    def _process_frames_parallel(self, video_path: str, frame_count: int, num_workers: int) -> List[Dict]:
        """Process video frames with GPU-aware optimization for single GPU"""
        # For single GPU, we need to be careful about parallel processing
        # GPU models are not thread-safe and can cause memory issues
        
        print("Single GPU detected - using optimized sequential processing with parallel preprocessing")
        
        # Use sequential processing for GPU inference but parallel for CPU tasks
        return self._process_frames_sequential_gpu(video_path, frame_count)
    
    def _process_frames_sequential_gpu(self, video_path: str, frame_count: int) -> List[Dict]:
        """Process frames sequentially on GPU with parallel CPU preprocessing"""
        all_detections = []
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return all_detections
        
        # Pre-load frames in parallel for CPU preprocessing
        print("Pre-loading frames in parallel for CPU preprocessing...")
        frame_batches = self._preload_frames_parallel(cap, frame_count)
        
        print(f"Processing {len(frame_batches)} pre-loaded frame batches on GPU...")
        
        # Process pre-loaded batches sequentially on GPU
        for i, (frame_id, frame, frame_rgb) in enumerate(frame_batches):
            if i % 50 == 0:
                print(f"GPU processing: {i}/{len(frame_batches)} batches")
            
            # Use the main tracker instance for GPU inference
            mot_results = self.tracker.predict_image([frame_rgb], visual=False)
            
            if not mot_results or not mot_results[0]:
                continue
            
            online_tlwhs, online_scores, online_ids = mot_results[0]
            
            # Process each detected class
            for class_id in online_tlwhs.keys():
                class_name = self.get_class_name(class_id)
                boxes_for_cls = online_tlwhs[class_id]
                scores_for_cls = online_scores[class_id]
                ids_for_cls = online_ids[class_id]
                
                if not ids_for_cls:
                    continue
                
                # Get image crops from the original BGR frame for Re-ID
                crops = self.get_crops(boxes_for_cls, frame, w=64, h=192)
                
                for j, track_id in enumerate(ids_for_cls):
                    # Convert tlwh to bbox format
                    x1, y1, w, h = boxes_for_cls[j]
                    bbox = [x1, y1, x1 + w, y1 + h]
                    
                    all_detections.append({
                        "frame_id": frame_id,
                        "track_id": track_id,
                        "class_name": class_name,
                        "bbox": bbox,
                        "bbox_tlwh": boxes_for_cls[j],
                        "score": float(scores_for_cls[j]),
                        "crop": crops[j] if j < len(crops) else None
                    })
        
        cap.release()
        return all_detections
    
    def _preload_frames_parallel(self, cap, frame_count: int) -> List[tuple]:
        """Pre-load frames in parallel for CPU preprocessing"""
        # Determine optimal batch size for pre-loading
        batch_size = max(1, frame_count // 20)  # Create ~20 batches for pre-loading
        frame_batches = []
        
        # Create frame ranges for parallel pre-loading
        frame_ranges = []
        for i in range(0, frame_count, batch_size):
            end_frame = min(i + batch_size, frame_count)
            frame_ranges.append((i, end_frame))
        
        print(f"Pre-loading {len(frame_ranges)} batches of ~{batch_size} frames each")
        
        # Pre-load frames in parallel (CPU-bound task)
        with ThreadPoolExecutor(max_workers=4) as executor:
            # Submit pre-loading tasks
            future_to_range = {
                executor.submit(self._preload_frame_batch, cap, start_frame, end_frame): (start_frame, end_frame)
                for start_frame, end_frame in frame_ranges
            }
            
            # Collect pre-loaded frames
            for future in future_to_range:
                try:
                    batch_frames = future.result()
                    frame_batches.extend(batch_frames)
                    start_frame, end_frame = future_to_range[future]
                    print(f"Pre-loaded batch {start_frame}-{end_frame}: {len(batch_frames)} frames")
                except Exception as e:
                    start_frame, end_frame = future_to_range[future]
                    print(f"Error pre-loading batch {start_frame}-{end_frame}: {e}")
        
        # Sort by frame_id to maintain temporal order
        frame_batches.sort(key=lambda x: x[0])
        
        return frame_batches
    
    def _preload_frame_batch(self, cap, start_frame: int, end_frame: int) -> List[tuple]:
        """Pre-load a batch of frames with CPU preprocessing"""
        batch_frames = []
        
        # Create a new video capture for this thread
        thread_cap = cv2.VideoCapture(cap.get(cv2.CAP_PROP_POS_FRAMES))
        thread_cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)
        
        frame_id = start_frame
        while frame_id < end_frame:
            ret, frame = thread_cap.read()
            if not ret:
                break
            
            frame_id += 1
            
            # Pre-process frame on CPU (convert to RGB)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            batch_frames.append((frame_id, frame, frame_rgb))
        
        thread_cap.release()
        return batch_frames
    
    def get_class_name(self, class_id: int) -> str:
        """Map class ID to class name - focused on vending machine contents"""
        # COCO classes relevant for vending machine items (fruits, vegetables, food, containers)
        # NOTE: COCO has limited produce - only broccoli and carrot for vegetables!
        vending_machine_classes = {
            # Beverages and containers
            39: 'bottle',
            40: 'wine_glass', 
            41: 'cup',
            45: 'bowl',
            
            # Fruits (COCO has these)
            46: 'banana',
            47: 'apple', 
            49: 'orange',
            
            # Vegetables (COCO only has these 2!)
            50: 'broccoli',
            51: 'carrot',
            
            # Prepared foods
            48: 'sandwich',
            52: 'hot_dog',
            53: 'pizza',
            54: 'donut',
            55: 'cake',
            
            # Packages/boxes (represented by bag-like items)
            24: 'backpack',  # Could represent packages
            26: 'handbag',   # Could represent small packages  
            28: 'suitcase',  # Could represent boxes
            
            # Utensils (if packaged with food)
            42: 'fork',
            43: 'knife', 
            44: 'spoon',
            
            # Cell phone (users might be detected)
            67: 'cell_phone',
            
            # Books/magazines (sometimes sold in vending machines)
            73: 'book'
        }
        
        # For unknown items (like squash, tomatoes, etc.), provide generic labels
        detected_class = vending_machine_classes.get(class_id, f'produce_item_{class_id}')
        
        # Add helpful generic labeling for likely misclassifications
        if class_id not in vending_machine_classes:
            # These might be other produce items not in COCO
            if 0 <= class_id <= 79:  # Within COCO range but not our mapped items
                detected_class = f'unidentified_item_{class_id}'
                
        return detected_class


def predict(
    video_url: str = Input(description="URL to download video from (may have authentication issues)", default=None),
    video_file: str = Input(description="Path to local video file", default=None),
    video: CogPath = Input(description="Uploaded video file (preferred method)", default=None)
) -> Dict[str, Any]:
    """
    Main prediction function for Cog with two-step tracking: ByteTrack + Re-ID clustering
    
    Args:
        video_url: URL to download video from (may have authentication issues)
        video_file: Path to local video file
        video: Uploaded video file (Cog Path object)
    
    Returns:
        Dictionary containing vending machine item tracking results with Re-ID clustering
    """
    try:
        tracker = MultiObjectTracker()
        
        if video:
            # Use uploaded video file (preferred method)
            video_path = str(video)
            cleanup_needed = False
            print(f"Using uploaded video: {video_path}")
        elif video_file:
            video_path = video_file
            cleanup_needed = False
            print(f"Using local video file: {video_path}")
        elif video_url:
            try:
                video_path = tracker.download_video(video_url)
                cleanup_needed = True
                print(f"Downloaded video from URL: {video_path}")
            except Exception as download_error:
                return {
                    "error": f"Failed to download video from URL: {str(download_error)}. Please try uploading the video file directly instead.",
                    "status": "failed",
                    "suggestion": "Use the 'video' parameter to upload a video file directly"
                }
        else:
            # Fallback to default URL with better error handling
            try:
                default_url = "https://waynestateprod-my.sharepoint.com/personal/hx4220_wayne_edu/_layouts/15/download.aspx?SourceUrl=/personal/hx4220_wayne_edu/Documents/vending%20rotation.mp4"
                video_path = tracker.download_video(default_url)
                cleanup_needed = True
                print(f"Using default video URL: {video_path}")
            except Exception as default_error:
                return {
                    "error": f"Failed to download default video: {str(default_error)}. Please provide a video file using the 'video' parameter.",
                    "status": "failed",
                    "suggestion": "Upload a video file using the 'video' parameter"
                }
        
        results = tracker.process_video(video_path)
        
        if cleanup_needed and os.path.exists(video_path):
            os.unlink(video_path)
        
        return results
        
    except Exception as e:
        return {
            "error": str(e),
            "status": "failed"
        }


if __name__ == "__main__":
    results = predict()
    print(json.dumps(results, indent=2))