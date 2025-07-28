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

# Cog imports
from cog import BasePredictor, Input, Path as CogPath

# Add PaddleDetection to Python path
sys.path.append('/opt/paddle/PaddleDetection')

# ByteTrack imports for PaddleDetection 2.8.1
from deploy.python.infer import Detector
from deploy.python.mot_sde_infer import SDE_Detector

class MultiObjectTracker:
    def __init__(self):
        """Initialize ByteTrack with PP-YOLOE detector for PaddleDetection 2.8.1"""
        # This path matches the export command in your cog.yaml
        self.model_dir = "/opt/paddle/PaddleDetection/output_inference/ppyoloe_crn_l_36e_640x640_mot17half"
        self.device = "GPU" if os.environ.get("CUDA_VISIBLE_DEVICES") else "CPU"
        
        # Create tracker config file
        self._create_tracker_config()
        
        # Initialize SDE tracker (ByteTrack) - optimized for vending machine detection
        self.tracker = SDE_Detector(
            model_dir=self.model_dir,
            tracker_config="/opt/paddle/PaddleDetection/tracker_config.yml",  # Use custom ByteTrack config
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
            reid_model_dir=None  # ByteTrack doesn't require ReID
        )
        
        self.object_counts = {}
        self.thumbnails = {}
        self.tracked_objects = {}
        
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
    
    def process_video(self, video_path: str) -> Dict[str, Any]:
        """Process video with ByteTrack for vending machine item detection and return tracking results with counts and thumbnails"""
        print(f"Processing video: {video_path}")
        
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")
        
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        cap.release()
        
        print(f"Video properties: {width}x{height}, {fps} fps, {frame_count} frames")
        
        results = {
            "total_frames": frame_count,
            "fps": fps,
            "resolution": f"{width}x{height}",
            "objects_detected": {},
            "tracking_summary": {},
            "thumbnails": {}
        }
        
        # Use the built-in predict_video method with text output
        print("Running ByteTrack inference with text output...")
        try:
            # Temporarily enable text output
            original_save_mot_txts = self.tracker.save_mot_txts
            self.tracker.save_mot_txts = True
            
            # Run video prediction
            # The camera_id=-1 indicates prediction from a video file, not a camera stream.
            self.tracker.predict_video(video_file=video_path, camera_id=-1)
            
            # Parse the output text file
            self._parse_mot_txt_results(results)
            
            # Restore original setting
            self.tracker.save_mot_txts = original_save_mot_txts
            
        except Exception as e:
            print(f"Video processing failed: {e}")
            # Fallback to frame-by-frame processing
            self._process_video_frame_by_frame(video_path, results)
        
        results["total_objects"] = sum(results["objects_detected"].values())
        results["unique_classes"] = list(results["objects_detected"].keys())
        
        return results
    
    def _parse_mot_txt_results(self, results):
        """Parse the MOT text output file and build results dictionary"""
        # Find the output text file
        output_dir = self.tracker.output_dir
        txt_files = [f for f in os.listdir(output_dir) if f.endswith('.txt')]
        
        if not txt_files:
            print("No MOT text files found")
            return
        
        # Read the first text file (should be the only one for single video)
        txt_file = os.path.join(output_dir, txt_files[0])
        print(f"Parsing MOT results from: {txt_file}")
        
        # Read video frames for thumbnail extraction
        video_path = txt_file.replace('.txt', '.mp4')  # Assuming same name
        if not os.path.exists(video_path):
            # Try to find the original video
            video_path = None
        
        frame_cache = {}
        if video_path:
            cap = cv2.VideoCapture(video_path)
            if cap.isOpened():
                frame_cache = self._load_video_frames(cap)
                cap.release()
        
        with open(txt_file, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                # Parse MOT format: frame, id, x1, y1, w, h, score, -1, -1, -1
                parts = line.split(',')
                if len(parts) < 7:
                    continue
                
                try:
                    frame_id = int(parts[0])
                    track_id = int(parts[1])
                    x1 = float(parts[2])
                    y1 = float(parts[3])
                    w = float(parts[4])
                    h = float(parts[5])
                    score = float(parts[6])
                    
                    # Convert to x1,y1,x2,y2 format
                    x2 = x1 + w
                    y2 = y1 + h
                    bbox = [x1, y1, x2, y2]
                    
                    # For MOT format, we need to infer class from track_id or use default
                    # Since MOT format doesn't include class info, we'll use a generic label
                    class_name = "detected_object"
                    object_id = f"{class_name}_{track_id}"
                    
                    if class_name not in results["objects_detected"]:
                        results["objects_detected"][class_name] = 0
                    results["objects_detected"][class_name] += 1
                    
                    # Generate thumbnail if frame is available
                    if frame_id in frame_cache and object_id not in results["thumbnails"]:
                        thumbnail = self.extract_thumbnail(frame_cache[frame_id], bbox, track_id)
                        if thumbnail:
                            results["thumbnails"][object_id] = {
                                "class": class_name,
                                "frame": frame_id,
                                "bbox": bbox,
                                "confidence": score,
                                "track_id": track_id,
                                "thumbnail": thumbnail
                            }
                    
                    if class_name not in results["tracking_summary"]:
                        results["tracking_summary"][class_name] = []
                    
                    results["tracking_summary"][class_name].append({
                        "frame": frame_id,
                        "bbox": bbox,
                        "confidence": score,
                        "object_id": object_id,
                        "track_id": track_id
                    })
                    
                except (ValueError, IndexError) as e:
                    print(f"Error parsing line: {line}, error: {e}")
                    continue
    
    def _load_video_frames(self, cap):
        """Load all video frames into memory for thumbnail extraction"""
        frames = {}
        frame_id = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            frame_id += 1
            frames[frame_id] = frame
        return frames
    
    def _process_video_frame_by_frame(self, video_path, results):
        """Fallback method: process video frame by frame"""
        print("Using frame-by-frame processing as fallback...")
        
        cap = cv2.VideoCapture(video_path)
        frame_id = 0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_id += 1
            if frame_id % 30 == 0:
                print(f"Processing frame {frame_id}")
            
            try:
                # Process single frame
                # The method expects a list of RGB images
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                frame_result = self.tracker.predict_image([frame_rgb], visual=False)
                
                if frame_result:
                    # Pass the original BGR frame for thumbnail extraction
                    self._process_frame_result(frame_result, frame, frame_id, results)
                    
            except Exception as frame_error:
                print(f"Error processing frame {frame_id}: {frame_error}")
                continue
        
        cap.release()
    
    def _process_frame_result(self, frame_result, frame, frame_id, results):
        """Process a single frame result and extract tracking information."""
        # Result for a single frame is a list with one item: [[online_tlwhs, online_scores, online_ids]]
        if not frame_result or not frame_result[0]:
            return
            
        mot_result = frame_result[0]
        online_tlwhs, online_scores, online_ids = mot_result[0], mot_result[1], mot_result[2]

        # online_tlwhs is a defaultdict where keys are class_ids
        # Iterate through each detected class
        for class_id in online_tlwhs.keys():
            class_name = self.get_class_name(class_id)
            
            # Get the lists of boxes, scores, and track_ids for this class
            boxes_for_cls = online_tlwhs[class_id]
            scores_for_cls = online_scores[class_id]
            ids_for_cls = online_ids[class_id]

            for i, tlwh in enumerate(boxes_for_cls):
                track_id = ids_for_cls[i]
                score = scores_for_cls[i]
                
                # tlwh is [x, y, width, height]
                x1, y1, w, h = tlwh
                bbox = [x1, y1, x1 + w, y1 + h]
                
                object_id = f"{class_name}_{track_id}"

                if class_name not in results["objects_detected"]:
                    results["objects_detected"][class_name] = 0
                results["objects_detected"][class_name] += 1

                # Generate thumbnail for first occurrence of each track
                if object_id not in results["thumbnails"]:
                    thumbnail = self.extract_thumbnail(frame, bbox, track_id)
                    if thumbnail:
                        results["thumbnails"][object_id] = {
                            "class": class_name,
                            "frame": frame_id,
                            "bbox": bbox,
                            "confidence": float(score),
                            "track_id": track_id,
                            "thumbnail": thumbnail
                        }

                if class_name not in results["tracking_summary"]:
                    results["tracking_summary"][class_name] = []
                
                results["tracking_summary"][class_name].append({
                    "frame": frame_id,
                    "bbox": bbox,
                    "confidence": float(score),
                    "object_id": object_id,
                    "track_id": track_id
                })
    
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
    Main prediction function for Cog with ByteTrack - optimized for vending machine detection
    
    Args:
        video_url: URL to download video from (may have authentication issues)
        video_file: Path to local video file
        video: Uploaded video file (Cog Path object)
    
    Returns:
        Dictionary containing vending machine item tracking results, object counts, and thumbnails
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