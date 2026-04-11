"""
Crop Disease Prediction - Model Architecture
==============================================
Defines the CNN model using MobileNetV2 transfer learning (PyTorch).
Includes model building, compilation, fine-tuning, and ONNX conversion.
"""

import os
import torch
import torch.nn as nn
from torchvision import models

from config import (
    INPUT_SHAPE,
    IMG_HEIGHT,
    IMG_WIDTH,
    NUM_CLASSES,
    LEARNING_RATE,
    FINE_TUNE_LEARNING_RATE,
    DROPOUT_RATE,
    FINE_TUNE_AT_LAYER,
    MODEL_DIR,
    MODEL_SAVE_NAME,
    ONNX_MODEL_NAME,
    DEVICE,
    ensure_dirs,
)


class CropDiseaseClassifier(nn.Module):
    """
    Crop disease classification model using MobileNetV2 as backbone.

    Architecture:
        MobileNetV2 (frozen) → GlobalAveragePooling → BN → Dense(256) → Dropout
        → Dense(128) → Dropout → Dense(num_classes)
    """

    def __init__(self, num_classes=NUM_CLASSES, dropout_rate=DROPOUT_RATE):
        super().__init__()

        # ─── Base model (pre-trained on ImageNet) ──────────────────────────
        self.base_model = models.mobilenet_v2(weights=models.MobileNet_V2_Weights.IMAGENET1K_V1)

        # Remove the original classifier
        self.features = self.base_model.features

        # Freeze all backbone layers initially
        for param in self.features.parameters():
            param.requires_grad = False

        # ─── Classification head ───────────────────────────────────────────
        self.classifier = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),       # Global Average Pooling
            nn.Flatten(),
            nn.BatchNorm1d(1280),          # MobileNetV2 outputs 1280 channels
            nn.Linear(1280, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout_rate),
            nn.Linear(256, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout_rate / 2),
            nn.Linear(128, num_classes),
        )

        # ─── Data augmentation (applied during training only) ──────────────
        self.augmentation = nn.Sequential(
            nn.Identity(),  # Augmentation done in dataset transforms
        )

    def forward(self, x):
        x = self.features(x)
        x = self.classifier(x)
        return x

    def get_num_backbone_layers(self):
        """Get total number of backbone feature layers."""
        return len(list(self.features.children()))


def build_model(num_classes=NUM_CLASSES):
    """
    Build a crop disease classification model using MobileNetV2 as backbone.

    Args:
        num_classes: Number of output classes.

    Returns:
        tuple: (model on device, base_features module reference)
    """
    print(f"[INFO] Building model with MobileNetV2 backbone...")
    print(f"  ├── Input shape:  {INPUT_SHAPE}")
    print(f"  ├── Num classes:  {num_classes}")
    print(f"  ├── Dropout rate: {DROPOUT_RATE}")
    print(f"  └── Device:       {DEVICE}")

    model = CropDiseaseClassifier(num_classes=num_classes).to(DEVICE)
    base_features = model.features

    # Model summary
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

    print(f"\n[INFO] Model built successfully!")
    print(f"  ├── Total params:     {total_params:,}")
    print(f"  ├── Trainable params: {trainable_params:,}")
    print(f"  └── Non-trainable:    {total_params - trainable_params:,}")

    return model, base_features


def unfreeze_for_fine_tuning(model, base_features=None, fine_tune_at=FINE_TUNE_AT_LAYER):
    """
    Unfreeze top layers of the base model for fine-tuning.

    Args:
        model: The full model.
        base_features: The base MobileNetV2 features module.
        fine_tune_at: Layer index from which to unfreeze.

    Returns:
        nn.Module: Model with unfrozen layers.
    """
    if base_features is None:
        base_features = model.features

    all_layers = list(base_features.children())
    total_layers = len(all_layers)

    # Clamp fine_tune_at to valid range
    fine_tune_at = min(fine_tune_at, total_layers)

    print(f"\n[INFO] Unfreezing base model layers from index {fine_tune_at}...")
    print(f"  ├── Total base layers: {total_layers}")
    print(f"  ├── Frozen layers:     {fine_tune_at}")
    print(f"  └── Unfrozen layers:   {total_layers - fine_tune_at}")

    # Unfreeze layers from fine_tune_at onward
    for i, layer in enumerate(all_layers):
        if i >= fine_tune_at:
            for param in layer.parameters():
                param.requires_grad = True

    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  └── Trainable params after unfreeze: {trainable_params:,}")

    return model


def save_model(model, save_dir=None, filename=None):
    """
    Save the trained model.

    Args:
        model: Trained model to save.
        save_dir: Directory to save to.
        filename: Filename for the saved model.

    Returns:
        str: Path to the saved model.
    """
    ensure_dirs()
    save_dir = save_dir or MODEL_DIR
    filename = filename or MODEL_SAVE_NAME
    save_path = os.path.join(save_dir, filename)

    torch.save({
        "model_state_dict": model.state_dict(),
        "model_class": "CropDiseaseClassifier",
    }, save_path)

    print(f"[INFO] Model saved to: {save_path}")

    # Get file size
    size_mb = os.path.getsize(save_path) / (1024 * 1024)
    print(f"  └── Size: {size_mb:.2f} MB")

    return save_path


def load_model(model_path=None, num_classes=NUM_CLASSES):
    """
    Load a trained model from disk.

    Args:
        model_path: Path to the saved model. If None, uses default path.
        num_classes: Number of output classes.

    Returns:
        nn.Module: Loaded model on device.
    """
    if model_path is None:
        model_path = os.path.join(MODEL_DIR, MODEL_SAVE_NAME)

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at: {model_path}")

    print(f"[INFO] Loading model from: {model_path}")

    model = CropDiseaseClassifier(num_classes=num_classes).to(DEVICE)
    checkpoint = torch.load(model_path, map_location=DEVICE, weights_only=False)
    model.load_state_dict(checkpoint["model_state_dict"])
    model.eval()

    print(f"[INFO] Model loaded successfully on {DEVICE}!")
    return model


def convert_to_onnx(model=None, model_path=None, num_classes=NUM_CLASSES):
    """
    Convert the PyTorch model to ONNX format for cross-platform deployment.

    Args:
        model: PyTorch model to convert (if None, loads from model_path).
        model_path: Path to saved model (used if model is None).
        num_classes: Number of output classes.

    Returns:
        str: Path to the saved ONNX model.
    """
    ensure_dirs()

    if model is None:
        model = load_model(model_path, num_classes=num_classes)

    model.eval()

    print("[INFO] Converting model to ONNX format...")

    # Create dummy input
    dummy_input = torch.randn(1, 3, IMG_HEIGHT, IMG_WIDTH).to(DEVICE)

    onnx_path = os.path.join(MODEL_DIR, ONNX_MODEL_NAME)

    torch.onnx.export(
        model,
        dummy_input,
        onnx_path,
        export_params=True,
        opset_version=13,
        do_constant_folding=True,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={
            "input": {0: "batch_size"},
            "output": {0: "batch_size"},
        },
    )

    size_mb = os.path.getsize(onnx_path) / (1024 * 1024)
    print(f"[INFO] ONNX model saved to: {onnx_path}")
    print(f"  └── Size: {size_mb:.2f} MB")

    return onnx_path


# ─── CLI entry point ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  Crop Disease Prediction - Model Architecture")
    print("=" * 60)

    model, base_features = build_model()

    # Print model summary using torchinfo
    try:
        from torchinfo import summary
        summary(model, input_size=(1, 3, IMG_HEIGHT, IMG_WIDTH), device=DEVICE)
    except ImportError:
        print("[INFO] Install torchinfo for detailed model summary: pip install torchinfo")
        print(model)

    print(f"\n[INFO] Model architecture OK ✓")
    print(f"[INFO] Device: {DEVICE}")
