# PaddleDetection Multi-Object Tracking Cog Model

This Cog model provides multi-object tracking capabilities using PaddleDetection's CenterTrack model.

## Features

- Multi-object tracking on video files
- Object counting and classification
- Thumbnail extraction for detected objects
- Support for both local video files and URLs
- Default video processing (vending machine rotation video)

## Usage

### Local Development

```bash
# Test the model locally
cog predict -i video_url="https://example.com/video.mp4"
```

### Push to Replicate

```bash
cog login
cog push r8.im/csdtdevelopers/trackers
```

## Input Parameters

- `video_url` (optional): URL to download video from
- `video_file` (optional): Path to local video file
- If neither is provided, uses the default vending machine video

## Output

Returns a JSON object containing:
- Video metadata (fps, frame count, resolution)
- Object detection counts by class
- Tracking summary with bounding boxes and confidence scores
- Base64-encoded thumbnails of detected objects

## Model Details

- Uses PaddleDetection's CenterTrack model
- Pre-trained on COCO dataset
- Supports GPU acceleration
- Built on PaddleDetection Docker image for optimal performance 