"""
Crop Disease Prediction - Training Pipeline
=============================================
Full training pipeline with callbacks, logging, and fine-tuning.
"""

import os
import json
import time
from datetime import datetime

import tensorflow as tf
from tensorflow.keras.callbacks import (
    ModelCheckpoint,
    EarlyStopping,
    ReduceLROnPlateau,
    TensorBoard,
    CSVLogger,
)

from config import (
    EPOCHS,
    FINE_TUNE_EPOCHS,
    EARLY_STOPPING_PATIENCE,
    REDUCE_LR_PATIENCE,
    REDUCE_LR_FACTOR,
    MODEL_DIR,
    LOGS_DIR,
    RESULTS_DIR,
    MODEL_SAVE_NAME,
    ensure_dirs,
)
from dataset import create_data_generators, download_dataset, create_tf_dataset
from model import build_model, unfreeze_for_fine_tuning, save_model, convert_to_tflite


def get_callbacks(phase="transfer_learning"):
    """
    Create training callbacks.

    Args:
        phase: Either 'transfer_learning' or 'fine_tuning'.

    Returns:
        list: List of Keras callbacks.
    """
    ensure_dirs()

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    callbacks = [
        # Save best model based on validation accuracy
        ModelCheckpoint(
            filepath=os.path.join(MODEL_DIR, f"best_{phase}_{MODEL_SAVE_NAME}"),
            monitor="val_accuracy",
            save_best_only=True,
            mode="max",
            verbose=1,
        ),
        # Stop early if no improvement
        EarlyStopping(
            monitor="val_accuracy",
            patience=EARLY_STOPPING_PATIENCE,
            restore_best_weights=True,
            verbose=1,
        ),
        # Reduce learning rate on plateau
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=REDUCE_LR_FACTOR,
            patience=REDUCE_LR_PATIENCE,
            min_lr=1e-7,
            verbose=1,
        ),
        # TensorBoard logging
        TensorBoard(
            log_dir=os.path.join(LOGS_DIR, f"{phase}_{timestamp}"),
            histogram_freq=1,
            write_graph=True,
        ),
        # CSV training log
        CSVLogger(
            os.path.join(RESULTS_DIR, f"{phase}_training_log.csv"),
            append=False,
        ),
    ]

    return callbacks


def train(data_dir=None, use_tf_data=False):
    """
    Full training pipeline:
      1. Transfer learning (frozen backbone)
      2. Fine-tuning (unfrozen top layers)
      3. Save final model + TFLite conversion

    Args:
        data_dir: Path to dataset directory. If None, downloads automatically.
        use_tf_data: If True, use tf.data pipeline instead of ImageDataGenerator.

    Returns:
        tuple: (model, history_transfer, history_finetune)
    """
    ensure_dirs()

    print("=" * 70)
    print("  🌱 Crop Disease Prediction - Training Pipeline")
    print("=" * 70)
    start_time = time.time()

    # ─── Step 1: Prepare dataset ───────────────────────────────────────────
    print("\n📦 Step 1: Preparing dataset...")
    if data_dir is None:
        data_dir = download_dataset()

    if use_tf_data:
        train_data, val_data, class_names = create_tf_dataset(data_dir)
        steps_per_epoch = None
        validation_steps = None
    else:
        train_data, val_data, class_names = create_data_generators(data_dir)
        steps_per_epoch = train_data.samples // train_data.batch_size
        validation_steps = val_data.samples // val_data.batch_size

    num_classes = len(class_names)

    # Save class names for inference
    class_names_path = os.path.join(MODEL_DIR, "class_names.json")
    with open(class_names_path, "w") as f:
        json.dump(class_names, f, indent=2)
    print(f"  └── Saved class names to: {class_names_path}")

    # ─── Step 2: Build model ──────────────────────────────────────────────
    print("\n🏗️  Step 2: Building model...")
    model, base_model = build_model(num_classes=num_classes)

    # ─── Step 3: Transfer Learning Phase ───────────────────────────────────
    print(f"\n🎓 Step 3: Transfer Learning ({EPOCHS} epochs)...")
    print("─" * 70)

    history_transfer = model.fit(
        train_data,
        validation_data=val_data,
        epochs=EPOCHS,
        steps_per_epoch=steps_per_epoch,
        validation_steps=validation_steps,
        callbacks=get_callbacks("transfer_learning"),
        verbose=1,
    )

    transfer_val_acc = max(history_transfer.history["val_accuracy"])
    print(f"\n[RESULT] Transfer Learning best val_accuracy: {transfer_val_acc:.4f}")

    # ─── Step 4: Fine-tuning Phase ─────────────────────────────────────────
    print(f"\n🔧 Step 4: Fine-tuning ({FINE_TUNE_EPOCHS} epochs)...")
    print("─" * 70)

    model = unfreeze_for_fine_tuning(model, base_model)

    total_epochs = EPOCHS + FINE_TUNE_EPOCHS

    history_finetune = model.fit(
        train_data,
        validation_data=val_data,
        epochs=total_epochs,
        initial_epoch=len(history_transfer.history["loss"]),
        steps_per_epoch=steps_per_epoch,
        validation_steps=validation_steps,
        callbacks=get_callbacks("fine_tuning"),
        verbose=1,
    )

    finetune_val_acc = max(history_finetune.history["val_accuracy"])
    print(f"\n[RESULT] Fine-tuning best val_accuracy: {finetune_val_acc:.4f}")

    # ─── Step 5: Save final model ──────────────────────────────────────────
    print("\n💾 Step 5: Saving model...")
    model_path = save_model(model)

    # ─── Step 6: Convert to TFLite ─────────────────────────────────────────
    print("\n📱 Step 6: Converting to TFLite for mobile deployment...")
    tflite_path = convert_to_tflite(model)

    # ─── Step 7: Save training metadata ────────────────────────────────────
    elapsed = time.time() - start_time
    metadata = {
        "timestamp": datetime.now().isoformat(),
        "training_time_seconds": round(elapsed),
        "training_time_human": f"{elapsed/3600:.1f} hours",
        "num_classes": num_classes,
        "class_names": class_names,
        "transfer_learning": {
            "epochs_trained": len(history_transfer.history["loss"]),
            "best_val_accuracy": round(transfer_val_acc, 4),
            "final_train_accuracy": round(history_transfer.history["accuracy"][-1], 4),
        },
        "fine_tuning": {
            "epochs_trained": len(history_finetune.history["loss"]),
            "best_val_accuracy": round(finetune_val_acc, 4),
            "final_train_accuracy": round(history_finetune.history["accuracy"][-1], 4),
        },
        "model_path": model_path,
        "tflite_path": tflite_path,
    }

    metadata_path = os.path.join(RESULTS_DIR, "training_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    # ─── Summary ───────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  ✅ Training Complete!")
    print("=" * 70)
    print(f"  ├── Total time:          {elapsed/3600:.1f} hours ({elapsed:.0f}s)")
    print(f"  ├── Transfer val_acc:    {transfer_val_acc:.4f}")
    print(f"  ├── Fine-tune val_acc:   {finetune_val_acc:.4f}")
    print(f"  ├── Model saved:         {model_path}")
    print(f"  ├── TFLite model:        {tflite_path}")
    print(f"  └── Training metadata:   {metadata_path}")
    print("=" * 70)

    return model, history_transfer, history_finetune


# ─── CLI entry point ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Train Crop Disease Prediction Model")
    parser.add_argument("--data-dir", type=str, default=None, help="Path to dataset directory")
    parser.add_argument("--use-tf-data", action="store_true", help="Use tf.data pipeline (faster)")
    args = parser.parse_args()

    model, h1, h2 = train(data_dir=args.data_dir, use_tf_data=args.use_tf_data)
