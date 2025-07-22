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
        
        # Initialize SDE tracker (ByteTrack) - optimized for vending machine detection
        self.tracker = SDE_Detector(
            model_dir=self.model_dir,
            tracker_config=None,  # Use default ByteTrack config
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
            draw_threshold=0.3,  # Lower draw threshold for glass occlusion
            reid_model_dir=None,  # ByteTrack doesn't require ReID
            reid_batch_size=50,
            use_dark=True
        )
        
        self.object_counts = {}
        self.thumbnails = {}
        self.tracked_objects = {}
        
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
        
        print(f"Video properties: {width}x{height}, {fps} fps, {frame_count} frames")
        
        frame_id = 0
        results = {
            "total_frames": frame_count,
            "fps": fps,
            "resolution": f"{width}x{height}",
            "objects_detected": {},
            "tracking_summary": {},
            "thumbnails": {}
        }
        
        try:
            # Try the video-based approach first
            frame_list = []
            cap = cv2.VideoCapture(video_path)
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                frame_list.append(frame)
            cap.release()
            
            print("Running ByteTrack inference...")
            mot_results = self.tracker.predict_video(frame_list, visual=False)
            self._process_mot_results(mot_results, frame_list, results)
            
        except Exception as e:
            print(f"Video-based processing failed: {e}")
            print("Falling back to frame-by-frame processing...")
            
            # Fallback: process frame by frame
            cap = cv2.VideoCapture(video_path)
            frame_id = 0
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_id += 1
                if frame_id % 30 == 0:
                    print(f"Processing frame {frame_id}/{frame_count}")
                
                try:
                    # Process single frame
                    frame_result = self.tracker.predict_image([frame], visual=False)
                    
                    if frame_result is not None:
                        self._process_frame_result(frame_result, frame, frame_id, results)
                        
                except Exception as frame_error:
                    print(f"Error processing frame {frame_id}: {frame_error}")
                    continue
            
            cap.release()
        
        results["total_objects"] = sum(results["objects_detected"].values())
        results["unique_classes"] = list(results["objects_detected"].keys())
        
        return results
    
    def _process_mot_results(self, mot_results, frame_list, results):
        """Process MOT results from video-based inference"""
        for frame_id, frame_result in enumerate(mot_results, 1):
            if frame_result is None:
                continue
                
            frame = frame_list[frame_id - 1]
            self._process_frame_result(frame_result, frame, frame_id, results)
            
            if frame_id % 30 == 0:
                print(f"Processed frame {frame_id}/{len(frame_list)}")
    
    def _process_frame_result(self, frame_result, frame, frame_id, results):
        """Process a single frame result and extract vending machine item tracking information"""
        # Handle different possible result formats
        boxes = None
        scores = None
        track_ids = None
        
        if hasattr(frame_result, 'boxes'):
            boxes = frame_result.boxes
            scores = getattr(frame_result, 'scores', [])
            track_ids = getattr(frame_result, 'ids', [])
        elif isinstance(frame_result, dict):
            boxes = frame_result.get('boxes', [])
            scores = frame_result.get('scores', [])
            track_ids = frame_result.get('ids', [])
        elif isinstance(frame_result, (list, tuple)) and len(frame_result) > 0:
            # Sometimes results come as [boxes, scores, ids]
            boxes = frame_result[0] if len(frame_result) > 0 else []
            scores = frame_result[1] if len(frame_result) > 1 else []
            track_ids = frame_result[2] if len(frame_result) > 2 else []
        
        if boxes is None or len(boxes) == 0:
            return
            
        for i, box in enumerate(boxes):
            score = scores[i] if i < len(scores) else 0.5
            
            if score > 0.3:  # Lower threshold for glass occlusion in vending machines
                # Get class information
                class_id = int(box[0]) if len(box) > 5 else 0
                class_name = self.get_class_name(class_id)
                bbox = box[2:6].tolist() if len(box) >= 6 else box[:4].tolist()
                track_id = track_ids[i] if i < len(track_ids) else f"det_{frame_id}_{i}"
                
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


def predict(video_url: str = None, video_file: str = None) -> Dict[str, Any]:
    """
    Main prediction function for Cog with ByteTrack - optimized for vending machine detection
    
    Args:
        video_url: URL to download video from
        video_file: Path to local video file
    
    Returns:
        Dictionary containing vending machine item tracking results, object counts, and thumbnails
    """
    try:
        tracker = MultiObjectTracker()
        
        if video_url:
            video_path = tracker.download_video(video_url)
            cleanup_needed = True
        elif video_file:
            video_path = video_file
            cleanup_needed = False
        else:
            # Your special default video URL preserved
            default_url = "https://waynestateprod-my.sharepoint.com/personal/hx4220_wayne_edu/_layouts/15/download.aspx?SourceUrl=/personal/hx4220_wayne_edu/Documents/vending%20rotation.mp4"
            video_path = tracker.download_video(default_url)
            cleanup_needed = True
        
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