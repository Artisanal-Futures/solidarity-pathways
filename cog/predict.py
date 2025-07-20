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

# PaddleDetection is already installed in the Docker image
from deploy.python.mot_centertrack_infer import CenterTrack
from deploy.python.utils import argsparser


class MultiObjectTracker:
    def __init__(self):
        """Initialize the multi-object tracker with PaddleDetection CenterTrack model"""
        self.model_dir = "/opt/paddle/PaddleDetection/output_inference/centertrack_hrnet_w18_256x192"
        self.device = "GPU" if os.environ.get("CUDA_VISIBLE_DEVICES") else "CPU"
        
        self.tracker = CenterTrack(
            model_dir=self.model_dir,
            device=self.device,
            threshold=0.5,
            output_dir="/tmp/output",
            save_images=True,
            save_mot_txts=True
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
        """Process video and return tracking results with counts and thumbnails"""
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
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_id += 1
            print(f"Processing frame {frame_id}/{frame_count}")
            
            frame_results = self.tracker.predict_image([frame[:, :, ::-1]], visual=False)
            
            if 'boxes' in frame_results and len(frame_results['boxes']) > 0:
                boxes = frame_results['boxes']
                scores = frame_results['scores']
                
                for i, (box, score) in enumerate(zip(boxes, scores)):
                    if score > self.tracker.threshold:
                        class_id = int(box[0])
                        class_name = self.tracker.pred_config.labels[class_id]
                        bbox = box[2:6].tolist()
                        
                        object_id = f"{class_name}_{frame_id}_{i}"
                        
                        if class_name not in results["objects_detected"]:
                            results["objects_detected"][class_name] = 0
                        results["objects_detected"][class_name] += 1
                        
                        thumbnail = self.extract_thumbnail(frame, bbox, object_id)
                        if thumbnail:
                            results["thumbnails"][object_id] = {
                                "class": class_name,
                                "frame": frame_id,
                                "bbox": bbox,
                                "confidence": float(score),
                                "thumbnail": thumbnail
                            }
                        
                        if class_name not in results["tracking_summary"]:
                            results["tracking_summary"][class_name] = []
                        
                        results["tracking_summary"][class_name].append({
                            "frame": frame_id,
                            "bbox": bbox,
                            "confidence": float(score),
                            "object_id": object_id
                        })
        
        cap.release()
        
        results["total_objects"] = sum(results["objects_detected"].values())
        results["unique_classes"] = list(results["objects_detected"].keys())
        
        return results


def predict(video_url: str = None, video_file: str = None) -> Dict[str, Any]:
    """
    Main prediction function for Cog
    
    Args:
        video_url: URL to download video from
        video_file: Path to local video file
    
    Returns:
        Dictionary containing tracking results, object counts, and thumbnails
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