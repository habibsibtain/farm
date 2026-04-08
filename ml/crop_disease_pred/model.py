"""
Crop Disease Prediction - Model Architecture
==============================================
Defines the CNN model using MobileNetV2 transfer learning.
Includes model building, compilation, fine-tuning, and TFLite conversion.
"""

import os
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers
from tensorflow.keras.applications import MobileNetV2

from config import (
    INPUT_SHAPE,
    NUM_CLASSES,
    LEARNING_RATE,
    FINE_TUNE_LEARNING_RATE,
    DROPOUT_RATE,
    FINE_TUNE_AT_LAYER,
    MODEL_DIR,
    MODEL_SAVE_NAME,
    TFLITE_MODEL_NAME,
    ensure_dirs,
)


def build_model(num_classes=NUM_CLASSES, input_shape=INPUT_SHAPE):
    """
    Build a crop disease classification model using MobileNetV2 as backbone.

    Architecture:
        MobileNetV2 (frozen) → GlobalAveragePooling → Dense(256) → Dropout → Dense(num_classes)

    Args:
        num_classes: Number of output classes.
        input_shape: Input image shape (H, W, C).

    Returns:
        tf.keras.Model: Compiled model ready for training.
    """
    print(f"[INFO] Building model with MobileNetV2 backbone...")
    print(f"  ├── Input shape:  {input_shape}")
    print(f"  ├── Num classes:  {num_classes}")
    print(f"  └── Dropout rate: {DROPOUT_RATE}")

    # ─── Base model (pre-trained on ImageNet) ──────────────────────────────
    base_model = MobileNetV2(
        input_shape=input_shape,
        include_top=False,
        weights="imagenet",
    )
    base_model.trainable = False  # Freeze all layers initially

    # ─── Data augmentation layer (built into the model) ─────────────────────
    data_augmentation = tf.keras.Sequential([
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.2),
        layers.RandomZoom(0.2),
        layers.RandomContrast(0.2),
    ], name="data_augmentation")

    # ─── Build the full model ──────────────────────────────────────────────
    inputs = layers.Input(shape=input_shape, name="input_image")

    # Augmentation (only active during training)
    x = data_augmentation(inputs)

    # Base model feature extraction
    x = base_model(x, training=False)

    # Classification head
    x = layers.GlobalAveragePooling2D(name="global_avg_pool")(x)
    x = layers.BatchNormalization(name="batch_norm")(x)
    x = layers.Dense(256, activation="relu", name="dense_256")(x)
    x = layers.Dropout(DROPOUT_RATE, name="dropout")(x)
    x = layers.Dense(128, activation="relu", name="dense_128")(x)
    x = layers.Dropout(DROPOUT_RATE / 2, name="dropout_2")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)

    model = models.Model(inputs, outputs, name="CropDiseaseClassifier")

    # ─── Compile ───────────────────────────────────────────────────────────
    model.compile(
        optimizer=optimizers.Adam(learning_rate=LEARNING_RATE),
        loss="categorical_crossentropy",
        metrics=[
            "accuracy",
            tf.keras.metrics.TopKCategoricalAccuracy(k=3, name="top3_accuracy"),
            tf.keras.metrics.AUC(name="auc", multi_label=True),
        ],
    )

    # Model summary
    total_params = model.count_params()
    trainable_params = sum(
        tf.keras.backend.count_params(w) for w in model.trainable_weights
    )
    print(f"\n[INFO] Model built successfully!")
    print(f"  ├── Total params:     {total_params:,}")
    print(f"  ├── Trainable params: {trainable_params:,}")
    print(f"  └── Non-trainable:    {total_params - trainable_params:,}")

    return model, base_model


def unfreeze_for_fine_tuning(model, base_model, fine_tune_at=FINE_TUNE_AT_LAYER):
    """
    Unfreeze top layers of the base model for fine-tuning.

    Args:
        model: The full model.
        base_model: The base MobileNetV2 model.
        fine_tune_at: Layer index from which to unfreeze.

    Returns:
        tf.keras.Model: Re-compiled model ready for fine-tuning.
    """
    print(f"\n[INFO] Unfreezing base model layers from index {fine_tune_at}...")
    print(f"  ├── Total base layers: {len(base_model.layers)}")
    print(f"  ├── Frozen layers:     {fine_tune_at}")
    print(f"  └── Unfrozen layers:   {len(base_model.layers) - fine_tune_at}")

    # Unfreeze layers
    base_model.trainable = True
    for layer in base_model.layers[:fine_tune_at]:
        layer.trainable = False

    # Re-compile with lower learning rate
    model.compile(
        optimizer=optimizers.Adam(learning_rate=FINE_TUNE_LEARNING_RATE),
        loss="categorical_crossentropy",
        metrics=[
            "accuracy",
            tf.keras.metrics.TopKCategoricalAccuracy(k=3, name="top3_accuracy"),
            tf.keras.metrics.AUC(name="auc", multi_label=True),
        ],
    )

    trainable_params = sum(
        tf.keras.backend.count_params(w) for w in model.trainable_weights
    )
    print(f"  └── Trainable params after unfreeze: {trainable_params:,}")

    return model


def save_model(model, save_dir=None, filename=None):
    """
    Save the trained model in Keras format.

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

    model.save(save_path)
    print(f"[INFO] Model saved to: {save_path}")

    # Get file size
    size_mb = os.path.getsize(save_path) / (1024 * 1024)
    print(f"  └── Size: {size_mb:.2f} MB")

    return save_path


def load_model(model_path=None):
    """
    Load a trained model from disk.

    Args:
        model_path: Path to the saved model. If None, uses default path.

    Returns:
        tf.keras.Model: Loaded model.
    """
    if model_path is None:
        model_path = os.path.join(MODEL_DIR, MODEL_SAVE_NAME)

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found at: {model_path}")

    print(f"[INFO] Loading model from: {model_path}")
    model = tf.keras.models.load_model(model_path)
    print(f"[INFO] Model loaded successfully!")

    return model


def convert_to_tflite(model=None, model_path=None, quantize=True):
    """
    Convert the Keras model to TensorFlow Lite format for mobile deployment.

    Args:
        model: Keras model to convert (if None, loads from model_path).
        model_path: Path to saved model (used if model is None).
        quantize: Whether to apply dynamic range quantization.

    Returns:
        str: Path to the saved TFLite model.
    """
    ensure_dirs()

    if model is None:
        model = load_model(model_path)

    print("[INFO] Converting model to TFLite format...")

    converter = tf.lite.TFLiteConverter.from_keras_model(model)

    if quantize:
        print("  ├── Applying dynamic range quantization...")
        converter.optimizations = [tf.lite.Optimize.DEFAULT]

    tflite_model = converter.convert()

    # Save
    tflite_path = os.path.join(MODEL_DIR, TFLITE_MODEL_NAME)
    with open(tflite_path, "wb") as f:
        f.write(tflite_model)

    size_mb = os.path.getsize(tflite_path) / (1024 * 1024)
    print(f"[INFO] TFLite model saved to: {tflite_path}")
    print(f"  └── Size: {size_mb:.2f} MB")

    return tflite_path


# ─── CLI entry point ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  Crop Disease Prediction - Model Architecture")
    print("=" * 60)

    model, base_model = build_model()
    model.summary()

    print("\n[INFO] Model architecture OK ✓")
