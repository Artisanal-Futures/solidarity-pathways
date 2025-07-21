# Alternative simpler approach using just the detector
# Replace the MultiObjectTracker.__init__ method with this if SDE_Detector doesn't work

def __init__(self):
    """Initialize simple detector without tracking (fallback approach)"""
    self.model_dir = "/opt/paddle/PaddleDetection/output_inference/ppyoloe_crn_l_36e_640x640_mot17half"
    self.device = "GPU" if os.environ.get("CUDA_VISIBLE_DEVICES") else "CPU"
    
    # Use simple detector
    self.detector = Detector(
        model_dir=self.model_dir,
        device=self.device,
        run_mode='paddle',
        batch_size=1,
        trt_min_shape=1,
        trt_max_shape=1280,
        trt_opt_shape=640,
        trt_calib_mode=False,
        cpu_threads=1,
        enable_mkldnn=False,
        threshold=0.5
    )
    
    self.object_counts = {}
    self.thumbnails = {}
    self.tracked_objects = {}

# And replace the process_video method with:
def process_video(self, video_path: str) -> Dict[str, Any]:
    """Process video with simple detection (no tracking)"""
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
        if frame_id % 30 == 0:
            print(f"Processing frame {frame_id}/{frame_count}")
        
        # Run detection
        detection_results = self.detector.predict_image([frame], visual=False)
        
        if detection_results and 'boxes' in detection_results:
            boxes = detection_results['boxes']
            
            for i, box in enumerate(boxes):
                if len(box) >= 6 and box[1] > 0.5:  # confidence check
                    class_id = int(box[0])
                    confidence = box[1]
                    bbox = box[2:6].tolist()
                    
                    class_name = self.get_class_name(class_id)
                    object_id = f"{class_name}_{frame_id}_{i}"
                    
                    if class_name not in results["objects_detected"]:
                        results["objects_detected"][class_name] = 0
                    results["objects_detected"][class_name] += 1
                    
                    thumbnail = self.extract_thumbnail(frame, bbox, i)
                    if thumbnail:
                        results["thumbnails"][object_id] = {
                            "class": class_name,
                            "frame": frame_id,
                            "bbox": bbox,
                            "confidence": float(confidence),
                            "thumbnail": thumbnail
                        }
                    
                    if class_name not in results["tracking_summary"]:
                        results["tracking_summary"][class_name] = []
                    
                    results["tracking_summary"][class_name].append({
                        "frame": frame_id,
                        "bbox": bbox,
                        "confidence": float(confidence),
                        "object_id": object_id
                    })
    
    cap.release()
    
    results["total_objects"] = sum(results["objects_detected"].values())
    results["unique_classes"] = list(results["objects_detected"].keys())
    
    return results