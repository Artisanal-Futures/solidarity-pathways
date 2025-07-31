
import cv2
import tempfile
import os
import numpy as np
from pathlib import Path
from typing import Set, Dict
from ultralytics import YOLO
from cog import BasePredictor, Input, Path as CogPath

# Acknowledge that the choice of tracker is inferred to be best for the described scenario.
print("Inference: Using the ByteTrack tracker as it is well-suited for handling occlusions [[1126, 2339]].")

class Predictor(BasePredictor):
    def setup(self) -> None:
        """Load the model into memory to make running multiple predictions efficient"""
        # Load the model from the specific path where it was downloaded during build
        # Using YOLO11x - the largest and most accurate model available
        model_path = "/root/.cache/ultralytics/yolo11x.pt"
        self.model = YOLO(model_path)
    
    def _create_tracker_config(self, track_buffer, track_high_thresh, track_low_thresh, new_track_thresh, 
                              match_thresh, appearance_thresh, proximity_thresh, gmc_method):
        """Create a custom tracker configuration with user-specified parameters"""
        import yaml
        import os
        
        # Custom tracker config with user parameters
        tracker_config = {
            'tracker_type': 'botsort',
            'track_high_thresh': track_high_thresh,
            'track_low_thresh': track_low_thresh,
            'new_track_thresh': new_track_thresh,
            'track_buffer': track_buffer,
            'match_thresh': match_thresh,
            'fuse_score': True,            # Fuse confidence scores with IoU distances
            'gmc_method': None if gmc_method == "None" else gmc_method,
            'with_reid': True,             # Enable Re-Identification for long-term tracking
            'proximity_thresh': proximity_thresh,
            'appearance_thresh': appearance_thresh
        }
        
        # Save custom tracker config
        config_path = "/tmp/custom_botsort.yaml"
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        with open(config_path, 'w') as f:
            yaml.dump(tracker_config, f)
        
        return config_path

    def predict(
        self,
        video: CogPath = Input(description="Input video file for object tracking"),
        debug: bool = Input(description="If true, processes only the first 4 seconds of the video for faster testing", default=False),
        # Detection parameters
        conf: float = Input(description="Confidence threshold for object detection (0.0-1.0)", default=0.3),
        iou: float = Input(description="IoU threshold for non-maximum suppression (0.0-1.0)", default=0.3),
        max_det: int = Input(description="Maximum number of detections per frame", default=50),# Allow more detections for better candidate selection
        # Tracking parameters
        track_buffer: int = Input(description="Number of frames to keep tracks alive (higher = more tolerance for occlusion)", default=300),
        track_high_thresh: float = Input(description="Threshold for first association during tracking (0.0-1.0)", default=0.3),
        track_low_thresh: float = Input(description="Threshold for second association during tracking (0.0-1.0)", default=0.1),
        new_track_thresh: float = Input(description="Threshold to initialize new tracks (0.0-1.0)", default=0.3),
        match_thresh: float = Input(description="Threshold for matching tracks (0.0-1.0)", default=0.7),
        appearance_thresh: float = Input(description="Minimum appearance similarity for ReID (0.0-1.0)", default=0.25),
        proximity_thresh: float = Input(description="Minimum IoU for ReID matching (0.0-1.0)", default=0.5),
        gmc_method: str = Input(description="Global motion compensation method", default="sparseOptFlow", choices=["orb", "sift", "ecc", "sparseOptFlow", "None"])
    ) -> dict:
        """
        Performs object tracking on a video to count the total number of unique objects detected.

        Args:
            video: The input video file uploaded by the user.
            debug: If True, processes only the first 4 seconds of the video. Defaults to False.
            track_buffer: Number of frames to keep tracks alive (higher = more tolerance for occlusion).
            track_high_thresh: Threshold for first association during tracking (0.0-1.0).
            track_low_thresh: Threshold for second association during tracking (0.0-1.0).
            new_track_thresh: Threshold to initialize new tracks (0.0-1.0).
            match_thresh: Threshold for matching tracks (0.0-1.0).
            appearance_thresh: Minimum appearance similarity for ReID (0.0-1.0).
            proximity_thresh: Minimum IoU for ReID matching (0.0-1.0).
            gmc_method: Global motion compensation method.

        Returns:
            dict: Contains total object count and representative images of each tracked object.
        """
        # Create custom tracker config with user parameters
        tracker_config_path = self._create_tracker_config(
            track_buffer, track_high_thresh, track_low_thresh, new_track_thresh,
            match_thresh, appearance_thresh, proximity_thresh, gmc_method
        )
        
        # Debug: Print parameter values at the start
        print(f"DEBUG: Input parameters - conf: {conf} (type: {type(conf)}), iou: {iou} (type: {type(iou)}), max_det: {max_det} (type: {type(max_det)})")
        
        print("DEBUG: Stage 1 - Getting video file path")
        # Get the video file path from the uploaded file
        # CogPath objects have a .path attribute that gives us the actual file path
        video_path = video.path if hasattr(video, 'path') else str(video)
        print(f"DEBUG: Video path type: {type(video)}, Video path value: {video_path}")
        
        print("DEBUG: Stage 2 - Checking if video file exists")
        # Ensure the video file exists
        video_file = Path(video_path)
        print(f"DEBUG: Video file path: {video_file}, exists: {video_file.is_file()}")
        if not video_file.is_file():
            raise FileNotFoundError(f"Error: Video file not found at {video_path}")

        print("DEBUG: Stage 3 - Opening video file with OpenCV")
        print(f"DEBUG: Attempting to open video at: {video_path}")
        # Open the video file using OpenCV
        cap = cv2.VideoCapture(video_path)
        print(f"DEBUG: VideoCapture opened: {cap.isOpened()}")
        if not cap.isOpened():
            raise IOError(f"Error: Could not open video file {video_path}")

        print("DEBUG: Stage 4 - Getting video properties")
        # Get video properties, specifically frames per second (FPS)
        fps = cap.get(cv2.CAP_PROP_FPS)
        print(f"DEBUG: Video FPS: {fps}")
        
        # Set to store unique track IDs and their best representative images
        unique_track_ids: Set[int] = set()
        object_images: Dict[int, np.ndarray] = {}  # track_id -> best image
        object_confidences: Dict[int, float] = {}  # track_id -> best confidence

        frame_count = 0
        max_frames = -1
        if debug:
            max_frames = int(4 * fps)
            print(f"DEBUG MODE: Processing only the first 4 seconds (~{max_frames} frames).")

        print("DEBUG: Stage 5 - Starting video frame processing loop")
        # Loop through the video frames
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break

            frame_count += 1
            if debug and frame_count > max_frames:
                print("DEBUG MODE: Reached 4-second limit. Stopping video processing.")
                break

            # Run YOLO tracking on the frame with custom tracker config
            # Handle parameter types carefully to avoid precision loss
            if frame_count == 1:
                print("DEBUG: Stage 6 - Processing first frame with YOLO tracking")
            
            track_kwargs = {
                'persist': True,
                'tracker': tracker_config_path,
                'verbose': False
            }
            
            # Only add parameters if they're not None and handle types carefully
            if frame_count % 30 == 0:  # Debug every 30 frames
                print(f"DEBUG: Before assignment - conf: {conf}, iou: {iou}, max_det: {max_det}")
            
            if conf is not None:
                track_kwargs['conf'] = float(conf) if hasattr(conf, 'dtype') else conf
            if iou is not None:
                track_kwargs['iou'] = float(iou) if hasattr(iou, 'dtype') else iou
            if max_det is not None:
                track_kwargs['max_det'] = int(max_det) if hasattr(max_det, 'dtype') else max_det
            
            # Debug: Print what we're actually passing to track
            if frame_count % 30 == 0:  # Log every 30 frames
                print(f"DEBUG: After assignment - conf: {track_kwargs.get('conf')}, iou: {track_kwargs.get('iou')}, max_det: {track_kwargs.get('max_det')}")
                print(f"DEBUG: Original conf value: {conf}")
                print(f"DEBUG: Local conf variable still: {conf}")
            
            if frame_count == 1:
                print("DEBUG: Stage 7 - Calling YOLO model.track()")
            
            results = self.model.track(frame, **track_kwargs)

            # Check if any objects were tracked in the current frame
            if results[0].boxes.id is not None:
                track_ids = results[0].boxes.id.int().cpu().tolist()
                boxes = results[0].boxes.xyxy.cpu().numpy()
                confidences = results[0].boxes.conf.cpu().numpy()
                
                # Debug logging
                if frame_count % 30 == 0:  # Log every 30 frames
                    print(f"Frame {frame_count}: Detected {len(track_ids)} objects with IDs: {track_ids}")
                    print(f"Confidences: {confidences}")
                
                # Add the new track IDs to the set of unique IDs
                unique_track_ids.update(track_ids)
                
                # Extract best representative images for each tracked object
                for i, track_id in enumerate(track_ids):
                    if i < len(boxes) and i < len(confidences):
                        box = boxes[i]
                        detection_conf = confidences[i]  # Renamed to avoid variable conflict
                        
                        # Keep the image with highest confidence for each track
                        if track_id not in object_confidences or detection_conf > object_confidences[track_id]:
                            # Extract object region from frame
                            x1, y1, x2, y2 = map(int, box)
                            x1, y1, x2, y2 = max(0, x1), max(0, y1), min(frame.shape[1], x2), min(frame.shape[0], y2)
                            
                            if x2 > x1 and y2 > y1:  # Valid bounding box
                                object_region = frame[y1:y2, x1:x2]
                                object_images[track_id] = object_region
                                object_confidences[track_id] = detection_conf

        # Release the video capture object
        cap.release()
        cv2.destroyAllWindows()

        print("DEBUG: Stage 8 - Video processing complete, preparing results")
        # Debug summary
        print(f"\n=== TRACKING SUMMARY ===")
        print(f"Total frames processed: {frame_count}")
        print(f"Unique track IDs found: {sorted(list(unique_track_ids))}")
        print(f"Total unique objects: {len(unique_track_ids)}")
        print(f"Objects with images: {len(object_images)}")
        print(f"Tracker config used: {tracker_config_path}")
        print(f"Detection params - conf: {conf}, iou: {iou}, max_det: {max_det}")
        print("=======================\n")

        # Save representative images and prepare response
        # Following ControlNet pattern for Replicate image handling
        object_images_output = []
        for track_id in sorted(unique_track_ids):
            if track_id in object_images:
                # Save image to temporary file with proper path handling
                import tempfile
                import os
                
                # Create a unique temporary file
                temp_fd, temp_path = tempfile.mkstemp(suffix='.jpg', prefix=f'object_{track_id}_')
                os.close(temp_fd)  # Close the file descriptor
                
                # Save the image
                cv2.imwrite(temp_path, object_images[track_id])
                
                # Create a path object that Replicate can handle
                try:
                    path_obj = CogPath(temp_path)
                    object_images_output.append(path_obj)
                except Exception as e:
                    print(f"Warning: Could not create Path object for object {track_id}: {e}")
                    # Fallback: just include the path
                    object_images_output.append(temp_path)

        # Return results following ControlNet pattern
        # Return the first image as main output, and include all data in the response
        if object_images_output:
            try:
                return object_images_output[0], {
                    "total_objects": len(unique_track_ids),
                    "all_object_images": object_images_output,
                    "track_ids": sorted(list(unique_track_ids)),
                    "summary": f"Detected {len(unique_track_ids)} unique objects in the video"
                }
            except Exception as e:
                print(f"Warning: Error returning first image, returning None: {e}")
                return None, {
                    "total_objects": len(unique_track_ids),
                    "all_object_images": object_images_output,
                    "track_ids": sorted(list(unique_track_ids)),
                    "summary": f"Detected {len(unique_track_ids)} unique objects in the video"
                }
        else:
            return None, {
                "total_objects": len(unique_track_ids),
                "all_object_images": [],
                "track_ids": sorted(list(unique_track_ids)),
                "summary": f"Detected {len(unique_track_ids)} unique objects in the video"
            }

# The predict function is now handled by Cog's BasePredictor classgit