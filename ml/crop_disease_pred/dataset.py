"""
Crop Disease Prediction - Dataset Module
==========================================
Handles downloading, preprocessing, and augmenting the PlantVillage dataset.
Uses PyTorch DataLoaders with torchvision transforms.
"""

import os
import shutil

import torch
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms

from config import (
    RAW_DATA_DIR,
    PROCESSED_DATA_DIR,
    IMG_SIZE,
    IMG_HEIGHT,
    IMG_WIDTH,
    BATCH_SIZE,
    VALIDATION_SPLIT,
    AUGMENTATION_CONFIG,
    KAGGLE_DATASET,
    NUM_WORKERS,
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


def _get_transforms(is_training=True):
    """
    Create image transforms for training or validation.

    Args:
        is_training: If True, includes data augmentation.

    Returns:
        torchvision.transforms.Compose: Transform pipeline.
    """
    if is_training:
        return transforms.Compose([
            transforms.Resize((IMG_HEIGHT + 32, IMG_WIDTH + 32)),
            transforms.RandomCrop((IMG_HEIGHT, IMG_WIDTH)),
            transforms.RandomHorizontalFlip(p=0.5 if AUGMENTATION_CONFIG["horizontal_flip"] else 0.0),
            transforms.RandomVerticalFlip(p=0.5 if AUGMENTATION_CONFIG["vertical_flip"] else 0.0),
            transforms.RandomRotation(degrees=AUGMENTATION_CONFIG["rotation_range"]),
            transforms.RandomAffine(
                degrees=0,
                translate=(AUGMENTATION_CONFIG["width_shift_range"], AUGMENTATION_CONFIG["height_shift_range"]),
                shear=AUGMENTATION_CONFIG["shear_range"] * 100,  # degrees
            ),
            transforms.ColorJitter(
                brightness=(AUGMENTATION_CONFIG["brightness_range"][0],
                            AUGMENTATION_CONFIG["brightness_range"][1]),
                contrast=0.2,
            ),
            transforms.RandomResizedCrop(
                (IMG_HEIGHT, IMG_WIDTH),
                scale=(1.0 - AUGMENTATION_CONFIG["zoom_range"], 1.0 + AUGMENTATION_CONFIG["zoom_range"]),
                ratio=(0.9, 1.1),
            ),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])
    else:
        return transforms.Compose([
            transforms.Resize((IMG_HEIGHT, IMG_WIDTH)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ])


def create_data_generators(data_dir=None):
    """
    Create training and validation data loaders with augmentation.

    Args:
        data_dir: Path to directory containing class subdirectories.
                  If None, uses default RAW_DATA_DIR/color.

    Returns:
        tuple: (train_loader, val_loader, class_names)
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

    # Load the full dataset (with validation transforms first to get class names)
    full_dataset = datasets.ImageFolder(data_dir, transform=_get_transforms(is_training=False))
    class_names = full_dataset.classes
    total_samples = len(full_dataset)

    # Split into train and validation
    val_size = int(total_samples * VALIDATION_SPLIT)
    train_size = total_samples - val_size

    train_dataset, val_dataset = random_split(
        full_dataset,
        [train_size, val_size],
        generator=torch.Generator().manual_seed(42),
    )

    # Apply training transforms to training set (wrap with a transform dataset)
    train_dataset = _TransformDataset(train_dataset, _get_transforms(is_training=True))

    # ─── Create DataLoaders ────────────────────────────────────────────────
    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=NUM_WORKERS,
        pin_memory=True,
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS,
        pin_memory=True,
    )

    print(f"\n[INFO] Dataset Summary:")
    print(f"  ├── Training samples:   {train_size}")
    print(f"  ├── Validation samples: {val_size}")
    print(f"  ├── Number of classes:  {len(class_names)}")
    print(f"  └── Class names: {class_names[:5]}... (showing first 5)")

    return train_loader, val_loader, class_names


class _TransformDataset(torch.utils.data.Dataset):
    """Wrapper to apply different transforms to a Subset."""

    def __init__(self, subset, transform):
        self.subset = subset
        self.transform = transform

    def __len__(self):
        return len(self.subset)

    def __getitem__(self, idx):
        # Get the original image path and label from the underlying dataset
        original_dataset = self.subset.dataset
        original_idx = self.subset.indices[idx]

        img_path, label = original_dataset.samples[original_idx]

        # Load and transform the image
        from PIL import Image
        img = Image.open(img_path).convert("RGB")

        if self.transform:
            img = self.transform(img)

        return img, label


def create_dataloaders(data_dir=None):
    """
    Create optimized PyTorch DataLoader pipelines.
    (Alternative name for create_data_generators for clarity.)

    Args:
        data_dir: Path to directory with class subdirectories.

    Returns:
        tuple: (train_loader, val_loader, class_names)
    """
    return create_data_generators(data_dir)


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

    # Step 3: Test data loaders
    train_loader, val_loader, classes = create_data_generators(data_path)

    # Verify a batch
    for images, labels in train_loader:
        print(f"\n[INFO] Sample batch:")
        print(f"  ├── Images shape: {images.shape}")
        print(f"  ├── Labels shape: {labels.shape}")
        print(f"  └── Dtype: {images.dtype}")
        break

    print(f"\n[SUCCESS] Dataset ready with {len(classes)} classes!")
