"""
Crop Disease Prediction ML Pipeline
=====================================
A complete machine learning system for identifying plant diseases
from leaf images using transfer learning with MobileNetV2.

Modules:
    - config: Central configuration and hyperparameters
    - dataset: Data download, preprocessing, and augmentation
    - model: Model architecture definition
    - train: Training pipeline with callbacks
    - evaluate: Model evaluation and visualization
    - predict: Single-image inference
    - api: Flask REST API for serving predictions
"""

__version__ = "1.0.0"
__author__ = "KisanMitra AI"
