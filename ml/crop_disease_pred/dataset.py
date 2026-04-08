"""
Crop Disease Prediction - Dataset Module
==========================================
Handles downloading, preprocessing, and augmenting the PlantVillage dataset.
"""

import os
import shutil
import numpy as np
from tqdm import tqdm

import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator

from config import (
    RAW_DATA_DIR,
    PROCESSED_DATA_DIR,
    IMG_SIZE,
    BATCH_SIZE,
    VALIDATION_SPLIT,
    AUGMENTATION_CONFIG,
    KAGGLE_DATASET,
    ensure_dirs,
)


def download_dataset():
    """
    Download the PlantVillage dataset from Kaggle using kagglehub.

    Returns:
        str: Path to the downloaded dataset directory.
    """
    ensure_dirs()

    # Check if data already exists
    color_dir = os.path.join(RAW_DATA_DIR, "color")
    if os.path.exists(color_dir) and len(os.listdir(color_dir)) > 0:
        print(f"[INFO] Dataset already exists at {color_dir}")
        return color_dir

    try:
        import kagglehub

        print("[INFO] Downloading PlantVillage dataset from Kaggle...")
        path = kagglehub.dataset_download(KAGGLE_DATASET)
        print(f"[INFO] Downloaded to: {path}")

        # Find the 'color' directory in downloaded data
        for root, dirs, files in os.walk(path):
            if "color" in dirs:
                src_color = os.path.join(root, "color")
                if src_color != color_dir:
                    print(f"[INFO] Copying dataset to {color_dir}...")
                    shutil.copytree(src_color, color_dir, dirs_exist_ok=True)
                return color_dir
            # Also check for 'PlantVillage' or similar directory names
            for d in dirs:
                subpath = os.path.join(root, d)
                if os.path.isdir(subpath):
                    subdirs = os.listdir(subpath)
                    # If any subdir looks like a disease class, use this as the data
                    if any("___" in s for s in subdirs):
                        if subpath != color_dir:
                            print(f"[INFO] Copying dataset to {color_dir}...")
                            shutil.copytree(subpath, color_dir, dirs_exist_ok=True)
                        return color_dir

        print(f"[WARNING] Could not find expected directory structure. Downloaded to: {path}")
        return path

    except ImportError:
        print("[ERROR] kagglehub not installed. Install with: pip install kagglehub")
        print("[INFO] Alternatively, download the dataset manually:")
        print(f"       https://www.kaggle.com/datasets/{KAGGLE_DATASET}")
        print(f"       Extract 'color' folder to: {color_dir}")
        raise
    except Exception as e:
        print(f"[ERROR] Failed to download dataset: {e}")
        print("[INFO] Please download manually from:")
        print(f"       https://www.kaggle.com/datasets/{KAGGLE_DATASET}")
        print(f"       Extract 'color' folder to: {color_dir}")
        raise


def create_data_generators(data_dir=None):
    """
    Create training and validation data generators with augmentation.

    Args:
        data_dir: Path to directory containing class subdirectories.
                  If None, uses default RAW_DATA_DIR/color.

    Returns:
        tuple: (train_generator, validation_generator, class_names)
    """
    if data_dir is None:
        data_dir = os.path.join(RAW_DATA_DIR, "color")

    if not os.path.exists(data_dir):
        raise FileNotFoundError(
            f"Dataset directory not found: {data_dir}\n"
            "Please run `python dataset.py` first to download the dataset."
        )

    print(f"[INFO] Loading dataset from: {data_dir}")
    print(f"[INFO] Image size: {IMG_SIZE}")
    print(f"[INFO] Batch size: {BATCH_SIZE}")

    # ─── Training data generator with augmentation ─────────────────────────
    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=AUGMENTATION_CONFIG["rotation_range"],
        width_shift_range=AUGMENTATION_CONFIG["width_shift_range"],
        height_shift_range=AUGMENTATION_CONFIG["height_shift_range"],
        shear_range=AUGMENTATION_CONFIG["shear_range"],
        zoom_range=AUGMENTATION_CONFIG["zoom_range"],
        horizontal_flip=AUGMENTATION_CONFIG["horizontal_flip"],
        vertical_flip=AUGMENTATION_CONFIG["vertical_flip"],
        fill_mode=AUGMENTATION_CONFIG["fill_mode"],
        brightness_range=AUGMENTATION_CONFIG["brightness_range"],
        validation_split=VALIDATION_SPLIT,
    )

    # ─── Validation data generator (no augmentation, only rescaling) ───────
    val_datagen = ImageDataGenerator(
        rescale=1.0 / 255,
        validation_split=VALIDATION_SPLIT,
    )

    # ─── Create generators ─────────────────────────────────────────────────
    train_generator = train_datagen.flow_from_directory(
        data_dir,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        subset="training",
        shuffle=True,
        seed=42,
    )

    validation_generator = val_datagen.flow_from_directory(
        data_dir,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode="categorical",
        subset="validation",
        shuffle=False,
        seed=42,
    )

    # Extract class names
    class_names = list(train_generator.class_indices.keys())

    print(f"\n[INFO] Dataset Summary:")
    print(f"  ├── Training samples:   {train_generator.samples}")
    print(f"  ├── Validation samples: {validation_generator.samples}")
    print(f"  ├── Number of classes:  {len(class_names)}")
    print(f"  └── Class names: {class_names[:5]}... (showing first 5)")

    return train_generator, validation_generator, class_names


def create_tf_dataset(data_dir=None):
    """
    Create tf.data.Dataset pipelines (alternative to generators, faster).

    Args:
        data_dir: Path to directory with class subdirectories.

    Returns:
        tuple: (train_ds, val_ds, class_names)
    """
    if data_dir is None:
        data_dir = os.path.join(RAW_DATA_DIR, "color")

    if not os.path.exists(data_dir):
        raise FileNotFoundError(f"Dataset directory not found: {data_dir}")

    print(f"[INFO] Creating tf.data pipelines from: {data_dir}")

    train_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=VALIDATION_SPLIT,
        subset="training",
        seed=42,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="categorical",
    )

    val_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=VALIDATION_SPLIT,
        subset="validation",
        seed=42,
        image_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        label_mode="categorical",
    )

    class_names = train_ds.class_names

    # ─── Performance optimization ──────────────────────────────────────────
    AUTOTUNE = tf.data.AUTOTUNE

    # Normalize pixel values to [0, 1]
    normalization_layer = tf.keras.layers.Rescaling(1.0 / 255)

    train_ds = train_ds.map(lambda x, y: (normalization_layer(x), y), num_parallel_calls=AUTOTUNE)
    val_ds = val_ds.map(lambda x, y: (normalization_layer(x), y), num_parallel_calls=AUTOTUNE)

    # Cache, shuffle, prefetch
    train_ds = train_ds.cache().shuffle(1000).prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)

    print(f"[INFO] Created optimized tf.data pipelines")
    print(f"  ├── Classes: {len(class_names)}")
    print(f"  └── First 5 classes: {class_names[:5]}")

    return train_ds, val_ds, class_names


def get_dataset_stats(data_dir=None):
    """Get statistics about the dataset (samples per class)."""
    if data_dir is None:
        data_dir = os.path.join(RAW_DATA_DIR, "color")

    stats = {}
    for class_name in sorted(os.listdir(data_dir)):
        class_path = os.path.join(data_dir, class_name)
        if os.path.isdir(class_path):
            count = len([f for f in os.listdir(class_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
            stats[class_name] = count

    total = sum(stats.values())
    print(f"\n{'='*60}")
    print(f"  Dataset Statistics")
    print(f"{'='*60}")
    print(f"  Total images: {total}")
    print(f"  Total classes: {len(stats)}")
    print(f"{'─'*60}")
    for name, count in sorted(stats.items(), key=lambda x: -x[1]):
        bar = '█' * int(count / max(stats.values()) * 30)
        print(f"  {name:<50} {count:>5} {bar}")
    print(f"{'='*60}\n")

    return stats


# ─── CLI entry point ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  Crop Disease Prediction - Dataset Setup")
    print("=" * 60)

    # Step 1: Download
    data_path = download_dataset()

    # Step 2: Show stats
    get_dataset_stats(data_path)

    # Step 3: Test generators
    train_gen, val_gen, classes = create_data_generators(data_path)
    print(f"\n[SUCCESS] Dataset ready with {len(classes)} classes!")
