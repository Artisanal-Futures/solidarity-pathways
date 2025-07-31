
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
        max_det: int = Input(description="Maximum number of detections per frame", default=25),# wouldn't see more than 25 obejcts in a frame
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
        
        # Get the video file path from the uploaded file
        video_path = str(video)
        
        # Ensure the video file exists
        video_file = Path(video_path)
        if not video_file.is_file():
            raise FileNotFoundError(f"Error: Video file not found at {video_path}")

        # Open the video file using OpenCV
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise IOError(f"Error: Could not open video file {video_path}")

        # Get video properties, specifically frames per second (FPS)
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        # Set to store unique track IDs and their best representative images
        unique_track_ids: Set[int] = set()
        object_images: Dict[int, np.ndarray] = {}  # track_id -> best image
        object_confidences: Dict[int, float] = {}  # track_id -> best confidence

        frame_count = 0
        max_frames = -1
        if debug:
            max_frames = int(4 * fps)
            print(f"DEBUG MODE: Processing only the first 4 seconds (~{max_frames} frames).")

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
            # Convert parameters to correct types to avoid type validation errors
            results = self.model.track(
                frame, 
                persist=True, 
                tracker=tracker_config_path,
                conf=float(conf),                   # Convert to regular float
                iou=float(iou),                     # Convert to regular float
                max_det=int(max_det),               # Convert to regular int
                verbose=True
            )

            # Check if any objects were tracked in the current frame
            if results[0].boxes.id is not None:
                track_ids = results[0].boxes.id.int().cpu().tolist()
                boxes = results[0].boxes.xyxy.cpu().numpy()
                confidences = results[0].boxes.conf.cpu().numpy()
                
                # Add the new track IDs to the set of unique IDs
                unique_track_ids.update(track_ids)
                
                # Extract best representative images for each tracked object
                for i, track_id in enumerate(track_ids):
                    if i < len(boxes) and i < len(confidences):
                        box = boxes[i]
                        conf = confidences[i]
                        
                        # Keep the image with highest confidence for each track
                        if track_id not in object_confidences or conf > object_confidences[track_id]:
                            # Extract object region from frame
                            x1, y1, x2, y2 = map(int, box)
                            x1, y1, x2, y2 = max(0, x1), max(0, y1), min(frame.shape[1], x2), min(frame.shape[0], y2)
                            
                            if x2 > x1 and y2 > y1:  # Valid bounding box
                                object_region = frame[y1:y2, x1:x2]
                                object_images[track_id] = object_region
                                object_confidences[track_id] = conf

        # Release the video capture object
        cap.release()
        cv2.destroyAllWindows()

        # Save representative images and prepare response
        # Following ControlNet pattern for Replicate image handling
        object_images_output = []
        for track_id in sorted(unique_track_ids):
            if track_id in object_images:
                # Save image to temporary file
                import tempfile
                import os
                
                temp_dir = tempfile.mkdtemp()
                image_path = os.path.join(temp_dir, f"object_{track_id}.jpg")
                cv2.imwrite(image_path, object_images[track_id])
                object_images_output.append(image_path)

        # Return results following ControlNet pattern
        # Return the first image as main output, and include all data in the response
        if object_images_output:
            return object_images_output[0], {
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