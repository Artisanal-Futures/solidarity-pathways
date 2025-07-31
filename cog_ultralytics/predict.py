
import cv2
import tempfile
import os
from pathlib import Path
from typing import Set
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

    def predict(
        self,
        video: CogPath = Input(description="Input video file for object tracking"),
        debug: bool = Input(description="If true, processes only the first 4 seconds of the video for faster testing", default=False)
    ) -> int:
        """
        Performs object tracking on a video to count the total number of unique objects detected.

        Args:
            video: The input video file uploaded by the user.
            debug: If True, processes only the first 4 seconds of the video. Defaults to True.

        Returns:
            int: The total count of unique objects tracked in the video.
        """
        # Get the video file path from the uploaded file
        video_path = str(video)
        
        # Ensure the video file exists
        video_file = Path(video_path)
        if not video_file.is_file():
            raise FileNotFoundError(f"Error: Video file not found at {video_path}")

            # Open the video file using OpenCV [[1130, 2341]]
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise IOError(f"Error: Could not open video file {video_path}")

        # Get video properties, specifically frames per second (FPS) [[493, 560]]
        fps = cap.get(cv2.CAP_PROP_FPS)
        
        # Set to store unique track IDs [[129, 338, 1125]]
        unique_track_ids: Set[int] = set()

        frame_count = 0
        max_frames = -1
        if debug:
            max_frames = int(4 * fps)
            print(f"DEBUG MODE: Processing only the first 4 seconds (~{max_frames} frames).")

        # Loop through the video frames [[1130, 2341]]
        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                # Break the loop if the end of the video is reached
                break

            frame_count += 1
            if debug and frame_count > max_frames:
                print("DEBUG MODE: Reached 4-second limit. Stopping video processing.")
                break

            # Run YOLO tracking on the frame with advanced parameters for carousel tracking
            # Using ReID (Re-Identification) for better long-term tracking across carousel rotation
            results = self.model.track(
                frame, 
                persist=True, 
                tracker="botsort.yaml",             # Use BoTSORT which supports ReID better than ByteTrack
                conf=0.3,                           # Lower confidence for glass reflections
                iou=0.3,                            # Lower IoU for better matching
                max_det=50,                         # Allow more detections per frame
                with_reid=True,                     # Enable Re-Identification for long-term tracking
                track_buffer=300,                   # Keep tracks alive for 300 frames (10 seconds at 30fps) - handles 8s carousel rotation
                track_high_thresh=0.3,              # Lower threshold for glass occlusion
                track_low_thresh=0.1,               # Very low threshold for weak detections
                new_track_thresh=0.3,               # Threshold for new track creation
                match_thresh=0.7,                   # Lower matching threshold for better association
                proximity_thresh=0.5,               # Minimum IoU for ReID matching
                appearance_thresh=0.25,             # Minimum appearance similarity for ReID
                verbose=True
            )

            # Check if any objects were tracked in the current frame [[1131, 2342]]
            if results[0].boxes.id is not None:
                # Get the track IDs
                track_ids = results[0].boxes.id.int().cpu().tolist()
                
                # Add the new track IDs to the set of unique IDs
                unique_track_ids.update(track_ids)
                
                # Optional: Visualize the results on the frame
                # annotated_frame = results[0].plot()
                # cv2.imshow("YOLOv8 Vending Machine Tracking", annotated_frame)
                # if cv2.waitKey(1) & 0xFF == ord("q"):
                #     break

        # Release the video capture object and close display windows [[1130, 2341]]
        cap.release()
        cv2.destroyAllWindows()

        # The total number of unique objects is the size of the set
        total_unique_objects = len(unique_track_ids)
        
        return total_unique_objects

# The predict function is now handled by Cog's BasePredictor classgit