FROM paddlecloud/paddledetection:2.4-gpu-cuda11.2-cudnn8-latest

# Install additional dependencies
RUN pip install requests==2.31.0

# Set up model directory and download the CenterTrack model
RUN mkdir -p /opt/paddle/PaddleDetection/output_inference
WORKDIR /opt/paddle/PaddleDetection

# Download and export the CenterTrack model
RUN python tools/export_model.py -c configs/mot/centertrack/centertrack_hrnet_w18_256x192.yml -o weights=https://paddledet.bj.bcebos.com/models/mot/centertrack_hrnet_w18_256x192.pdparams

# Set working directory back to the cog directory
WORKDIR /src