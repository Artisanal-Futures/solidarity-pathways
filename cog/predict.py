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
from deploy.python.infer import Detector, load_predictor, PredictConfig
from deploy.python.mot_sde_infer import SDE_Detector

# Import scikit-learn for clustering
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import normalize

class MultiObjectTracker:
    def __init__(self, debug_mode=False):
        """Initialize ByteTrack with PP-YOLOE detector and Re-ID model for PaddleDetection 2.8.1"""
        # Detection model path
        self.detector_model_dir = "/opt/paddle/PaddleDetection/output_inference/mot_detector/ppyoloe_crn_l_36e_640x640_mot17half"
        # Re-ID model path
        self.reid_model_dir = "/opt/paddle/PaddleDetection/output_inference/reid_model/deepsort_pplcnet"
        self.device = "GPU" if os.environ.get("CUDA_VISIBLE_DEVICES") else "CPU"
        
        # Debug mode for detailed validation output
        self.debug_mode = debug_mode
        if self.debug_mode:
            print("🔍 Debug mode enabled - detailed validation output will be shown")
        
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
        if not self.reid_model_dir or not os.path.exists(self.reid_model_dir):
            raise RuntimeError(f"Re-ID model directory not found: {self.reid_model_dir}. Re-ID is required for object clustering.")

        try:
            # Step 1: Load the model's configuration from its infer_cfg.yml file.
            # The PredictConfig class handles this automatically.
            self.reid_pred_config = PredictConfig(self.reid_model_dir)
            if not hasattr(self.reid_pred_config, 'arch') or not self.reid_pred_config.arch:
                raise RuntimeError(f"Invalid or missing architecture in Re-ID config at {self.reid_model_dir}/infer_cfg.yml. Re-ID is required for object clustering.")

            # Step 2: Initialize the predictor using the loaded configuration.
            self.reid_predictor, _ = load_predictor(
                self.reid_model_dir,
                run_mode='paddle',
                batch_size=50,  # ReID is often batched on crops, 50 is a common value
                device=self.device,
                min_subgraph_size=self.reid_pred_config.min_subgraph_size,
                use_dynamic_shape=self.reid_pred_config.use_dynamic_shape,
                trt_min_shape=1,
                trt_max_shape=1280,
                trt_opt_shape=640,
                trt_calib_mode=False,
                cpu_threads=1,
                enable_mkldnn=False,
                arch=self.reid_pred_config.arch
            )
            print(f"Re-ID predictor initialized successfully from {self.reid_model_dir}")

        except Exception as e:
            raise RuntimeError(f"Failed to initialize Re-ID predictor: {e}. Re-ID is required for object clustering.")
        
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
    
    def get_validation_summary(self):
        """
        Get a comprehensive summary of the validation status and pipeline configuration.
        This is useful for monitoring and debugging.
        """
        summary = {
            "pipeline_status": "initialized",
            "validation_checks": {},
            "model_configuration": {},
            "debug_mode": self.debug_mode
        }
        
        # Check Re-ID model status
        try:
            if hasattr(self, 'reid_predictor') and self.reid_predictor:
                summary["validation_checks"]["reid_model"] = "✓ Initialized"
                if hasattr(self, 'expected_reid_input_shape'):
                    summary["model_configuration"]["reid_input_shape"] = str(self.expected_reid_input_shape)
                if hasattr(self, 'expected_reid_output_shape'):
                    summary["model_configuration"]["reid_output_shape"] = str(self.expected_reid_output_shape)
            else:
                summary["validation_checks"]["reid_model"] = "✗ Not initialized"
        except Exception as e:
            summary["validation_checks"]["reid_model"] = f"✗ Error: {str(e)}"
        
        # Check tracker status
        try:
            if hasattr(self, 'tracker') and self.tracker:
                summary["validation_checks"]["tracker"] = "✓ Initialized"
            else:
                summary["validation_checks"]["tracker"] = "✗ Not initialized"
        except Exception as e:
            summary["validation_checks"]["tracker"] = f"✗ Error: {str(e)}"
        
        # Check expected configurations
        if hasattr(self, 'expected_crop_shape'):
            summary["model_configuration"]["expected_crop_shape"] = str(self.expected_crop_shape)
        if hasattr(self, 'imagenet_mean'):
            summary["model_configuration"]["imagenet_mean"] = str(self.imagenet_mean.tolist())
        if hasattr(self, 'imagenet_std'):
            summary["model_configuration"]["imagenet_std"] = str(self.imagenet_std.tolist())
        
        return summary
    
    def _run_self_tests(self):
        """
        Run comprehensive self-tests to validate the Re-ID preprocessing pipeline.
        This ensures all validation logic works correctly during initialization.
        """
        print("=== Running Re-ID Pipeline Self-Tests ===")
        
        # Test 1: Validate tensor dimension validation
        print("\nTest 1: Tensor dimension validation")
        try:
            test_tensor = np.random.rand(3, 192, 64, 3).astype(np.float32)
            self.validate_tensor_dimensions(test_tensor, "test_tensor", (3, 192, 64, 3), np.float32)
            print("✓ Tensor dimension validation passed")
        except Exception as e:
            print(f"✗ Tensor dimension validation failed: {e}")
            return False
        
        # Test 2: Validate crop dimension fixing
        print("\nTest 2: Crop dimension fixing")
        try:
            # Test 5D input (problematic case)
            problematic_crops = np.random.rand(3, 1, 192, 64, 3).astype(np.float32)
            fixed_crops = self.validate_and_fix_crop_dimensions(problematic_crops)
            if fixed_crops.shape == (3, 3, 192, 64):
                print("✓ Crop dimension fixing passed")
            else:
                print(f"✗ Crop dimension fixing failed: expected (3, 3, 192, 64), got {fixed_crops.shape}")
                return False
        except Exception as e:
            print(f"✗ Crop dimension fixing failed: {e}")
            return False
        
        # Test 3: Validate Re-ID preprocessing
        print("\nTest 3: Re-ID preprocessing validation")
        try:
            # Create correctly preprocessed crops (ImageNet normalized)
            correct_crops = np.random.rand(3, 192, 64, 3).astype(np.float32)
            # Apply ImageNet normalization
            mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
            std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
            correct_crops = (correct_crops - mean) / std
            
            processed_crops = self.validate_reid_preprocessing(correct_crops)
            if processed_crops.shape == (3, 3, 192, 64):
                print("✓ Re-ID preprocessing validation passed")
            else:
                print(f"✗ Re-ID preprocessing failed: expected (3, 3, 192, 64), got {processed_crops.shape}")
                return False
        except Exception as e:
            print(f"✗ Re-ID preprocessing validation failed: {e}")
            return False
        
        # Test 4: Validate Re-ID feature validation
        print("\nTest 4: Re-ID feature validation")
        try:
            # Create reasonable features
            good_features = np.random.rand(3, 512).astype(np.float32)
            self.validate_reid_features(good_features, 3)
            print("✓ Re-ID feature validation passed")
        except Exception as e:
            print(f"✗ Re-ID feature validation failed: {e}")
            return False
        
        # Test 5: Test error cases
        print("\nTest 5: Error case validation")
        try:
            # Test wrong dimensions
            wrong_crops = np.random.rand(3, 64, 192, 3).astype(np.float32)  # Wrong height/width
            try:
                self.validate_reid_preprocessing(wrong_crops)
                print("✗ Should have failed for wrong dimensions")
                return False
            except ValueError:
                print("✓ Correctly caught wrong dimensions")
            
            # Test all zero features
            zero_features = np.zeros((3, 512), dtype=np.float32)
            try:
                self.validate_reid_features(zero_features, 3)
                print("✗ Should have failed for zero features")
                return False
            except ValueError:
                print("✓ Correctly caught zero features")
                
        except Exception as e:
            print(f"✗ Error case validation failed: {e}")
            return False
        
        print("\n✓ All self-tests passed!")
        print("✓ Re-ID pipeline validation is working correctly")
        return True
    
    def validate_pipeline_configuration(self):
        """
        Comprehensive validation of the entire pipeline configuration.
        This should be called at the beginning of processing to catch issues early.
        """
        print("=== Pipeline Configuration Validation ===")
        
        # Validate Re-ID model configuration
        if not hasattr(self, 'reid_pred_config') or not self.reid_pred_config:
            raise RuntimeError("Re-ID predictor configuration not initialized")
        
        if not hasattr(self, 'reid_predictor') or not self.reid_predictor:
            raise RuntimeError("Re-ID predictor not initialized")
        
        # Get expected input/output shapes from the Re-ID model
        try:
            input_names = self.reid_predictor.get_input_names()
            output_names = self.reid_predictor.get_output_names()
            
            if not input_names or not output_names:
                raise RuntimeError("Re-ID model input/output names not available")
            
            input_tensor = self.reid_predictor.get_input_handle(input_names[0])
            output_tensor = self.reid_predictor.get_output_handle(output_names[0])
            
            # Store expected shapes for validation
            self.expected_reid_input_shape = input_tensor.shape
            self.expected_reid_output_shape = output_tensor.shape
            
            print(f"✓ Re-ID model input shape: {self.expected_reid_input_shape}")
            print(f"✓ Re-ID model output shape: {self.expected_reid_output_shape}")
            
            # Validate that the Re-ID model expects the format we're providing
            # Expected: (batch_size, channels, height, width) = (batch_size, 3, 192, 64)
            if len(self.expected_reid_input_shape) == 4:
                batch_size, channels, height, width = self.expected_reid_input_shape
                if channels != 3:
                    raise RuntimeError(f"Re-ID model expects {channels} channels, but we're providing 3")
                if height != 192 or width != 64:
                    raise RuntimeError(f"Re-ID model expects {height}x{width}, but we're providing 192x64")
                print(f"✓ Re-ID model input format validation passed: (batch_size, {channels}, {height}, {width})")
            else:
                print(f"Warning: Re-ID model input shape is not 4D: {self.expected_reid_input_shape}")
            
        except Exception as e:
            raise RuntimeError(f"Failed to get Re-ID model shapes: {e}")
        
        # Validate crop processing configuration
        self.expected_crop_shape = (192, 64, 3)  # Height, Width, Channels
        self.expected_crop_batch_shape = (None, 3, 192, 64)  # Batch, Channels, Height, Width
        
        print(f"✓ Expected individual crop shape: {self.expected_crop_shape}")
        print(f"✓ Expected crop batch shape: {self.expected_crop_batch_shape}")
        
        # Validate normalization parameters
        self.imagenet_mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        self.imagenet_std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        print(f"✓ ImageNet normalization: mean={self.imagenet_mean}, std={self.imagenet_std}")
        
        # Validate tracker configuration
        if not hasattr(self, 'tracker') or not self.tracker:
            raise RuntimeError("Tracker not initialized")
        
        print("✓ Tracker initialized successfully")
        
        # Run self-tests to validate the validation logic itself
        print("\nRunning validation logic self-tests...")
        if not self._run_self_tests():
            raise RuntimeError("Re-ID pipeline self-tests failed. Validation logic may be broken.")
        
        print("✓ Pipeline configuration validation passed")
        print("=" * 50)
    
    def validate_tensor_dimensions(self, tensor, name, expected_shape, expected_dtype=None):
        """
        Comprehensive tensor dimension validation.
        
        Args:
            tensor: The tensor to validate
            name: Name of the tensor for error messages
            expected_shape: Expected shape (can be tuple or list of possible shapes)
            expected_dtype: Expected data type (optional)
            
        Returns:
            True if validation passes
            
        Raises:
            ValueError: If validation fails
        """
        if tensor is None:
            raise ValueError(f"{name} is None")
        
        # Convert expected_shape to list of tuples for easier comparison
        if isinstance(expected_shape, tuple):
            expected_shapes = [expected_shape]
        elif isinstance(expected_shape, list):
            expected_shapes = expected_shape
        else:
            raise ValueError(f"expected_shape must be tuple or list, got {type(expected_shape)}")
        
        actual_shape = tensor.shape
        actual_dtype = tensor.dtype
        
        # Check shape
        shape_matches = False
        for exp_shape in expected_shapes:
            if exp_shape is None or len(exp_shape) != len(actual_shape):
                continue
            
            # Check each dimension, allowing None to match any value
            dim_matches = True
            for i, (exp_dim, act_dim) in enumerate(zip(exp_shape, actual_shape)):
                if exp_dim is not None and exp_dim != act_dim:
                    dim_matches = False
                    break
            
            if dim_matches:
                shape_matches = True
                break
        
        if not shape_matches:
            expected_str = " or ".join([str(s) for s in expected_shapes])
            raise ValueError(f"{name} shape mismatch: expected {expected_str}, got {actual_shape}")
        
        # Check dtype if specified
        if expected_dtype is not None and actual_dtype != expected_dtype:
            raise ValueError(f"{name} dtype mismatch: expected {expected_dtype}, got {actual_dtype}")
        
        if self.debug_mode:
            print(f"🔍 {name} validation details:")
            print(f"   Shape: {actual_shape}")
            print(f"   Dtype: {actual_dtype}")
            print(f"   Min value: {np.min(tensor):.4f}")
            print(f"   Max value: {np.max(tensor):.4f}")
            print(f"   Mean value: {np.mean(tensor):.4f}")
        else:
            print(f"✓ {name} validation passed: shape={actual_shape}, dtype={actual_dtype}")
        return True
    
    def validate_reid_features(self, features, num_crops):
        """
        Validate Re-ID feature extraction results to ensure the model is working correctly.
        
        Args:
            features: Extracted Re-ID features
            num_crops: Number of input crops
            
        Returns:
            True if validation passes
        """
        print(f"=== Re-ID Feature Validation ===")
        
        if features is None:
            raise ValueError("Re-ID features are None")
        
        print(f"Feature array shape: {features.shape}")
        print(f"Expected features: {num_crops}")
        
        # Validate feature array shape
        if len(features.shape) != 2:
            raise ValueError(f"Expected 2D feature array, got shape {features.shape}")
        
        batch_size, feature_dim = features.shape
        if batch_size != num_crops:
            raise ValueError(f"Feature batch size mismatch: expected {num_crops}, got {batch_size}")
        
        # Validate feature dimension (should be reasonable for Re-ID)
        if feature_dim < 64 or feature_dim > 2048:
            print(f"Warning: Unusual feature dimension: {feature_dim}")
            print(f"Typical Re-ID feature dimensions are between 64-2048")
        
        # Validate feature values
        feature_min = np.min(features)
        feature_max = np.max(features)
        feature_mean = np.mean(features)
        feature_std = np.std(features)
        
        print(f"Feature statistics:")
        print(f"  Range: [{feature_min:.4f}, {feature_max:.4f}]")
        print(f"  Mean: {feature_mean:.4f}")
        print(f"  Std: {feature_std:.4f}")
        
        # Check for reasonable feature values
        if np.isnan(features).any():
            raise ValueError("Features contain NaN values")
        
        if np.isinf(features).any():
            raise ValueError("Features contain infinite values")
        
        # Check if features are all zeros (indicates model failure)
        if np.allclose(features, 0):
            raise ValueError("All features are zero - this indicates Re-ID model failure")
        
        # Check if features are all identical (indicates model failure)
        if np.allclose(features, features[0]):
            raise ValueError("All features are identical - this indicates Re-ID model failure")
        
        # Validate feature norms (should be reasonable for L2 normalization)
        feature_norms = np.linalg.norm(features, axis=1)
        norm_mean = np.mean(feature_norms)
        norm_std = np.std(feature_norms)
        
        print(f"Feature L2 norms: mean={norm_mean:.4f}, std={norm_std:.4f}")
        
        # Check if norms are reasonable (not too small or too large)
        if norm_mean < 0.1:
            print(f"Warning: Very small feature norms (mean={norm_mean:.4f})")
        if norm_mean > 10.0:
            print(f"Warning: Very large feature norms (mean={norm_mean:.4f})")
        
        print(f"✓ Re-ID feature validation passed")
        print(f"✓ Features shape: {features.shape}")
        print(f"✓ Feature dimension: {feature_dim}")
        
        return True
    
    def validate_reid_preprocessing(self, crops, expected_shape=(192, 64, 3)):
        """
        Comprehensive validation of Re-ID preprocessing to ensure crops are properly formatted
        for the PaddleDetection DeepSORT Re-ID model.
        
        This function validates:
        1. Correct dimensions and orientation
        2. Proper color space (RGB)
        3. Correct normalization (ImageNet mean/std)
        4. Proper data type (float32)
        5. Correct dimension ordering for Re-ID model
        
        Args:
            crops: Input crops array
            expected_shape: Expected shape for individual crops (height, width, channels)
            
        Returns:
            Validated and properly formatted crops for Re-ID model
        """
        if crops is None or len(crops) == 0:
            raise ValueError("No crops provided for Re-ID preprocessing validation")
        
        print(f"=== Re-ID Preprocessing Validation ===")
        print(f"Input crops shape: {crops.shape}")
        print(f"Expected individual crop shape: {expected_shape}")
        
        # Step 1: Handle dimension issues
        if len(crops.shape) == 5:
            # Shape: (num_crops, 1, height, width, channels) - remove extra batch dimension
            print("Detected 5D input, removing extra batch dimension...")
            crops = crops.squeeze(axis=1)
            print(f"After squeeze: {crops.shape}")
        elif len(crops.shape) == 4:
            # Shape: (num_crops, height, width, channels) - this is correct
            print("Detected 4D input, shape looks correct...")
        else:
            raise ValueError(f"Unexpected crops shape: {crops.shape}. Expected 4D or 5D array.")
        
        # Step 2: Validate individual crop dimensions
        num_crops, height, width, channels = crops.shape
        if (height, width, channels) != expected_shape:
            raise ValueError(f"Individual crop shape mismatch: expected {expected_shape}, got ({height}, {width}, {channels})")
        
        # Step 3: Validate data type
        if crops.dtype != np.float32:
            print(f"Warning: Converting crops from {crops.dtype} to float32")
            crops = crops.astype(np.float32)
        
        # Step 4: Validate normalization range
        # Re-ID models expect normalized values, typically in range [-1, 1] or [0, 1]
        # Check if crops are already normalized (should be in range roughly [-2, 2] for ImageNet normalization)
        min_val = np.min(crops)
        max_val = np.max(crops)
        print(f"Crop value range: [{min_val:.3f}, {max_val:.3f}]")
        
        # Expected range for ImageNet normalization: roughly [-2, 2]
        # (0 - mean) / std = (0 - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225] ≈ [-2.1, 1.8]
        if min_val < -3 or max_val > 3:
            print(f"Warning: Crop values outside expected ImageNet normalization range [-3, 3]")
            print(f"This may indicate incorrect preprocessing")
        
        # Step 5: Validate color space (should be RGB)
        # Since we convert BGR to RGB in get_crops(), this should be correct
        # But let's verify the color distribution looks reasonable
        if channels == 3:
            # Check if the color distribution looks reasonable for RGB
            # In RGB, all channels should have similar ranges
            r_mean = np.mean(crops[:, :, :, 0])
            g_mean = np.mean(crops[:, :, :, 1])
            b_mean = np.mean(crops[:, :, :, 2])
            print(f"Channel means (R,G,B): ({r_mean:.3f}, {g_mean:.3f}, {b_mean:.3f})")
            
            # If one channel is significantly different, it might indicate BGR instead of RGB
            channel_diff = max(abs(r_mean - g_mean), abs(r_mean - b_mean), abs(g_mean - b_mean))
            if channel_diff > 0.5:
                print(f"Warning: Large channel differences detected ({channel_diff:.3f})")
                print(f"This might indicate incorrect color space conversion")
        
        # Step 6: Convert to Re-ID model format: (batch_size, channels, height, width)
        # This is the standard format for most deep learning models including PaddleDetection
        crops_reid_format = np.transpose(crops, (0, 3, 1, 2))
        print(f"Converted to Re-ID format: {crops_reid_format.shape}")
        
        # Step 7: Final validation of Re-ID format
        batch_size, channels, height, width = crops_reid_format.shape
        if channels != 3 or height != 192 or width != 64:
            raise ValueError(f"Re-ID format validation failed: expected (batch_size, 3, 192, 64), got {crops_reid_format.shape}")
        
        print(f"✓ Re-ID preprocessing validation passed")
        print(f"✓ Final format: {crops_reid_format.shape} (batch_size, channels, height, width)")
        print(f"✓ Data type: {crops_reid_format.dtype}")
        print(f"✓ Value range: [{np.min(crops_reid_format):.3f}, {np.max(crops_reid_format):.3f}]")
        
        return crops_reid_format
    
    def validate_and_fix_crop_dimensions(self, crops, expected_shape=(192, 64, 3)):
        """
        Validate and fix crop dimensions for Re-ID processing.
        
        Args:
            crops: Input crops array with potentially incorrect dimensions
            expected_shape: Expected shape for individual crops (height, width, channels)
            
        Returns:
            Fixed crops array with correct dimensions for Re-ID model
        """
        if crops is None or len(crops) == 0:
            raise ValueError("No crops provided for validation")
        
        print(f"Validating crop dimensions...")
        print(f"Input crops shape: {crops.shape}")
        print(f"Expected individual crop shape: {expected_shape}")
        
        # Handle different input shapes
        if len(crops.shape) == 5:
            # Shape: (num_crops, 1, height, width, channels) - remove extra batch dimension
            print("Detected 5D input, removing extra batch dimension...")
            crops = crops.squeeze(axis=1)
            print(f"After squeeze: {crops.shape}")
        elif len(crops.shape) == 4:
            # Shape: (num_crops, height, width, channels) - this is correct
            print("Detected 4D input, shape looks correct...")
        else:
            raise ValueError(f"Unexpected crops shape: {crops.shape}. Expected 4D or 5D array.")
        
        # Validate individual crop dimensions
        num_crops, height, width, channels = crops.shape
        if (height, width, channels) != expected_shape:
            raise ValueError(f"Individual crop shape mismatch: expected {expected_shape}, got ({height}, {width}, {channels})")
        
        # Convert to Re-ID model format: (batch_size, channels, height, width)
        # This is the standard format for most deep learning models
        crops_reid_format = np.transpose(crops, (0, 3, 1, 2))
        print(f"Converted to Re-ID format: {crops_reid_format.shape}")
        
        return crops_reid_format
    
    def get_crops(self, tlwhs, frame, w=64, h=192):
        """Extracts and resizes image crops from bounding boxes."""
        crops = []
        
        # Validate expected crop dimensions
        expected_shape = (h, w, 3)  # Height, Width, Channels (RGB)
        print(f"Expected crop shape: {expected_shape}")
        
        # Pre-define normalization arrays as float32 to avoid dtype issues
        # This prevents NumPy from upcasting to float64 during arithmetic operations
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        
        if len(tlwhs) == 0:
            print("Warning: No bounding boxes provided for cropping")
            return np.array(crops, dtype=np.float32)
        
        for i, tlwh in enumerate(tlwhs):
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
                    
                    # Apply normalization according to ImageNet standards (common for Re-ID models)
                    # Ensure all operations use float32 to prevent dtype mismatches
                    resized_crop = resized_crop.astype('float32') / 255.0
                    resized_crop = (resized_crop - mean) / std
                    
                    # STRICT VALIDATION: Check individual crop shape immediately
                    if resized_crop.shape != expected_shape:
                        raise ValueError(f"Crop {i} shape mismatch: expected {expected_shape}, got {resized_crop.shape}")
                    
                    # Don't add batch dimension here - we'll handle it later
                    crops.append(resized_crop)
                else:
                    print(f"Warning: Empty crop for bbox {tlwh}")
                    zero_crop = np.zeros((h, w, 3), dtype='float32')
                    if zero_crop.shape != expected_shape:
                        raise ValueError(f"Zero crop {i} shape mismatch: expected {expected_shape}, got {zero_crop.shape}")
                    crops.append(zero_crop)
            else:
                print(f"Warning: Invalid bbox dimensions {tlwh}")
                zero_crop = np.zeros((h, w, 3), dtype='float32')
                if zero_crop.shape != expected_shape:
                    raise ValueError(f"Zero crop {i} shape mismatch: expected {expected_shape}, got {zero_crop.shape}")
                crops.append(zero_crop)
        
        # Convert to numpy array without adding extra batch dimension
        crops_array = np.array(crops, dtype=np.float32)
        expected_batch_shape = (len(crops), h, w, 3)
        
        # STRICT VALIDATION: Check overall array shape
        if crops_array.shape != expected_batch_shape:
            raise ValueError(f"Crops array shape mismatch: expected {expected_batch_shape}, got {crops_array.shape}")
        
        # STRICT VALIDATION: Check each individual crop shape again
        for i, crop in enumerate(crops_array):
            if crop.shape != expected_shape:
                raise ValueError(f"Individual crop {i} in array shape mismatch: expected {expected_shape}, got {crop.shape}")
        
        print(f"Crops validation passed: {len(crops)} crops with shape {crops_array.shape}")
        
        # FINAL VALIDATION: Ensure we're returning the correct format
        # Each individual crop should be (192, 64, 3) and the array should be (num_crops, 192, 64, 3)
        if len(crops_array.shape) != 4:
            raise ValueError(f"Final crops array should be 4D, got {len(crops_array.shape)}D with shape {crops_array.shape}")
        
        if crops_array.shape[1:] != (h, w, 3):
            raise ValueError(f"Final crops array individual crop shape should be ({h}, {w}, 3), got {crops_array.shape[1:]}")
        
        print(f"✓ Final validation: returning {crops_array.shape[0]} crops with individual shape {crops_array.shape[1:]}")
        return crops_array
    
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
            raise RuntimeError("Re-ID predictor not initialized. Cannot extract features.")
        
        # Validate input crops
        if crops is None or len(crops) == 0:
            raise ValueError("No crops provided for Re-ID feature extraction")
        
        # Expected shape for Re-ID model: (batch_size, channels, height, width)
        # where height=192, width=64, channels=3
        expected_shape = (3, 192, 64)  # Channels, Height, Width
        
        try:
            # Get input/output handles
            input_names = self.reid_predictor.get_input_names()
            output_names = self.reid_predictor.get_output_names()
            input_tensor = self.reid_predictor.get_input_handle(input_names[0])
            output_tensor = self.reid_predictor.get_output_handle(output_names[0])
            
            # Validate input data shape for Re-ID model
            if len(crops.shape) != 4:
                raise ValueError(f"Expected 4D input data (batch_size, channels, height, width), got shape {crops.shape}")
            
            # Validate the spatial dimensions (batch_size, channels, height, width)
            batch_size, channels, height, width = crops.shape
            if channels != 3 or height != 192 or width != 64:
                raise ValueError(f"Expected input shape (batch_size, 3, 192, 64), got {crops.shape}")
            
            # Ensure input data is float32 to prevent dtype mismatches with model weights
            input_data = crops.astype(np.float32)
            
            # Debug: Log data type and shape before inference
            print(f"Re-ID input data shape: {input_data.shape}, dtype: {input_data.dtype}")
            
            input_tensor.copy_from_cpu(input_data)
            self.reid_predictor.run()
            features = output_tensor.copy_to_cpu()
            
            return features
            
        except Exception as e:
            raise RuntimeError(f"Failed to extract Re-ID features: {e}")
    
    def process_video(self, video_path: str) -> Dict[str, Any]:
        """
        Process video with an EFFICIENT two-step tracking workflow:
        1. Single-pass ByteTrack to get detections and crops.
        2. Offline Re-ID clustering to get stable IDs.
        """
        print(f"=== Starting video processing ===")
        print(f"Video path: {video_path}")
        
        # Validate pipeline configuration first
        self.validate_pipeline_configuration()
        
        # Validate video file exists
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        print(f"Video file exists, opening with OpenCV...")
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")
        
        print(f"Video opened successfully, reading properties...")
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        print(f"Video properties: {width}x{height}, {fps} fps, {frame_count} frames")
        
        # Release the capture since we'll use pre-loaded frames
        cap.release()
        print(f"Initial video capture released")
        
        # --- Step 1: Parallel Frame Processing ---
        print("=== Step 1: Parallel Frame Processing ===")
        
        # Determine optimal number of workers
        num_workers = min(mp.cpu_count(), 8)  # Cap at 8 to avoid memory issues
        print(f"CPU cores available: {mp.cpu_count()}, using {num_workers} parallel workers")
        
        # Process frames in parallel
        print(f"Starting frame processing with {num_workers} workers...")
        all_detections = self._process_frames_parallel(video_path, frame_count, num_workers)
        
        print(f"Frame processing complete: {len(all_detections)} detections across {frame_count} frames")
        
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
        print("=== Step 2: Re-ID Feature Extraction and Clustering ===")
        
        # Extract features from all crops
        print(f"Preparing crops for Re-ID feature extraction...")
        
        # Debug: Check individual crop shapes before creating array
        crop_list = [d['crop'] for d in all_detections if d['crop'] is not None]
        print(f"Number of crops to process: {len(crop_list)}")
        
        for i, crop in enumerate(crop_list[:3]):  # Check first 3 crops
            print(f"Crop {i} shape: {crop.shape}, dtype: {crop.dtype}")
        
        all_crops = np.array(crop_list)
        print(f"Valid crops found: {len(all_crops)} out of {len(all_detections)} detections")
        
        if len(all_crops) == 0:
            raise RuntimeError("No valid image crops found for Re-ID feature extraction. Cannot proceed with clustering.")
        
        # STRICT VALIDATION: Check the raw crops array shape immediately
        print(f"Raw all_crops shape: {all_crops.shape}")
        expected_raw_shape = (len(all_crops), 192, 64, 3)  # (num_crops, height, width, channels)
        
        if all_crops.shape != expected_raw_shape:
            raise ValueError(f"Raw crops array shape mismatch: expected {expected_raw_shape}, got {all_crops.shape}. This indicates crops were stored with wrong dimensions.")
        
        # STRICT VALIDATION: Check each individual crop shape
        for i, crop in enumerate(all_crops):
            expected_crop_shape = (192, 64, 3)
            if crop.shape != expected_crop_shape:
                raise ValueError(f"Individual crop {i} shape mismatch: expected {expected_crop_shape}, got {crop.shape}")
        
        print(f"✓ Raw crops validation passed: {all_crops.shape}")
        
        # Comprehensive Re-ID preprocessing validation
        all_crops = self.validate_reid_preprocessing(all_crops, expected_shape=(192, 64, 3))
        
        print(f"Extracting Re-ID features from {all_crops.shape[0]} crops...")
        all_features = self.extract_reid_features(all_crops)
        print(f"Re-ID features extracted successfully: {all_features.shape}")
        
        # Comprehensive Re-ID feature validation
        self.validate_reid_features(all_features, len(all_crops))
        
        # Add features back to detections
        crop_idx = 0
        for detection in all_detections:
            if detection['crop'] is not None:
                detection['feature'] = all_features[crop_idx]
                crop_idx += 1
        
        # Normalize features for clustering
        print(f"Normalizing features for clustering...")
        normalized_features = normalize(all_features, norm='l2')
        
        # Cluster using DBSCAN
        print(f"Performing DBSCAN clustering with eps=0.4, min_samples=2...")
        clustering = DBSCAN(eps=0.4, min_samples=2, metric='cosine').fit(normalized_features)
        cluster_labels = clustering.labels_
        
        unique_clusters = len(set(cluster_labels)) - (1 if -1 in cluster_labels else 0)
        noise_points = list(cluster_labels).count(-1)
        print(f"Clustering complete: {unique_clusters} clusters, {noise_points} noise points")
        
        # Validate clustering results
        self.validate_tensor_dimensions(
            cluster_labels,
            "cluster_labels",
            expected_shape=(len(all_features),),
            expected_dtype=np.int32
        )
        
        print(f"Clustering validation passed: {len(cluster_labels)} labels assigned")
        
        # Assign cluster labels back to detections
        crop_idx = 0
        for detection in all_detections:
            if detection['crop'] is not None:
                detection['cluster_id'] = int(cluster_labels[crop_idx])
                crop_idx += 1
            else:
                detection['cluster_id'] = -1  # Noise
        
        # --- Step 3: Build Final Results ---
        print("=== Step 3: Building Final Results ===")
        
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
            },
            "validation_summary": self.get_validation_summary() if self.debug_mode else None
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
        
        print(f"=== Video Processing Complete ===")
        print(f"Final results: {results['total_objects']} unique objects across {len(results['unique_classes'])} classes")
        print(f"Classes detected: {results['unique_classes']}")
        print(f"Total frames processed: {results['total_frames']}")
        print(f"Video resolution: {results['resolution']}")
        print(f"Video FPS: {results['fps']}")
        
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
        print(f"Starting GPU-optimized sequential processing for {frame_count} frames")
        all_detections = []
        
        # Pre-load frames in parallel for CPU preprocessing
        print("Pre-loading frames in parallel for CPU preprocessing...")
        frame_batches = self._preload_frames_parallel(video_path, frame_count)
        
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
                    
                    # Ensure individual crop has correct shape (192, 64, 3)
                    individual_crop = crops[j] if j < len(crops) else None
                    if individual_crop is not None:
                        # Validate individual crop shape
                        expected_crop_shape = (192, 64, 3)
                        if individual_crop.shape != expected_crop_shape:
                            raise ValueError(f"Individual crop {j} shape mismatch: expected {expected_crop_shape}, got {individual_crop.shape}")
                    
                    all_detections.append({
                        "frame_id": frame_id,
                        "track_id": track_id,
                        "class_name": class_name,
                        "bbox": bbox,
                        "bbox_tlwh": boxes_for_cls[j],
                        "score": float(scores_for_cls[j]),
                        "crop": individual_crop
                    })
        
        print(f"GPU processing complete. Total detections: {len(all_detections)}")
        return all_detections
    
    def _preload_frames_parallel(self, video_path: str, frame_count: int) -> List[tuple]:
        """Pre-load frames in parallel for CPU preprocessing"""
        if video_path is None:
            raise ValueError("Video path is required for frame pre-loading")
        
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        # Determine optimal batch size for pre-loading
        batch_size = max(1, frame_count // 20)  # Create ~20 batches for pre-loading
        frame_batches = []
        
        # Create frame ranges for parallel pre-loading
        frame_ranges = []
        for i in range(0, frame_count, batch_size):
            end_frame = min(i + batch_size, frame_count)
            frame_ranges.append((i, end_frame))
        
        print(f"Pre-loading {len(frame_ranges)} batches of ~{batch_size} frames each")
        print(f"Using ThreadPoolExecutor with max_workers=4 for parallel pre-loading")
        
        # Pre-load frames in parallel (CPU-bound task)
        with ThreadPoolExecutor(max_workers=4) as executor:
            # Submit pre-loading tasks
            future_to_range = {
                executor.submit(self._preload_frame_batch, video_path, start_frame, end_frame): (start_frame, end_frame)
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
    
    def _preload_frame_batch(self, video_path: str, start_frame: int, end_frame: int) -> List[tuple]:
        """Pre-load a batch of frames with CPU preprocessing"""
        batch_frames = []
        
        # Create a new video capture for this thread
        thread_cap = cv2.VideoCapture(video_path)
        if not thread_cap.isOpened():
            print(f"Warning: Could not open video in thread for frames {start_frame}-{end_frame}")
            return []
            
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
    
    def _preload_frames_sequential(self, video_path: str, frame_count: int) -> List[tuple]:
        """Fallback sequential frame pre-loading when parallel processing fails"""
        if video_path is None:
            raise ValueError("Video path is required for sequential frame pre-loading")
        
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        frame_batches = []
        
        print("Using sequential frame pre-loading...")
        
        # Create a new video capture for sequential processing
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Could not open video file: {video_path}")
        
        # Process frames sequentially
        frame_id = 0
        while frame_id < frame_count:
            ret, frame = cap.read()
            if not ret:
                break
            
            frame_id += 1
            
            # Pre-process frame on CPU (convert to RGB)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            frame_batches.append((frame_id, frame, frame_rgb))
            
            if frame_id % 50 == 0:
                print(f"Sequential pre-loading: {frame_id}/{frame_count} frames")
        
        cap.release()
        return frame_batches
    
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
    video: CogPath = Input(description="Uploaded video file (preferred method)", default=None),
    debug_mode: bool = Input(description="Enable debug mode for detailed validation output", default=True)
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
        tracker = MultiObjectTracker(debug_mode=debug_mode)
        
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