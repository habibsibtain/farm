"""
Crop Disease Prediction ML Pipeline
=====================================
A complete machine learning system for identifying plant diseases
from leaf images using transfer learning with MobileNetV2.

Powered by PyTorch with automatic GPU acceleration.

Modules:
    - config: Central configuration and hyperparameters
    - dataset: Data download, preprocessing, and augmentation
    - model: Model architecture definition (PyTorch)
    - train: Training pipeline with GPU support
    - evaluate: Model evaluation and visualization
    - predict: Single-image inference
    - api: Flask REST API for serving predictions
"""

__version__ = "2.0.0"
__author__ = "KisanMitra AI"
