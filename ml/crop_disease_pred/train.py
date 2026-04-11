"""
Crop Disease Prediction - Training Pipeline
=============================================
Full training pipeline with GPU support, callbacks, logging, and fine-tuning.
Uses PyTorch for native Windows GPU acceleration.
"""

import os
import csv
import json
import time
from datetime import datetime

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.tensorboard import SummaryWriter
from tqdm import tqdm

from config import (
    EPOCHS,
    FINE_TUNE_EPOCHS,
    LEARNING_RATE,
    FINE_TUNE_LEARNING_RATE,
    EARLY_STOPPING_PATIENCE,
    REDUCE_LR_PATIENCE,
    REDUCE_LR_FACTOR,
    MODEL_DIR,
    LOGS_DIR,
    RESULTS_DIR,
    MODEL_SAVE_NAME,
    DEVICE,
    ensure_dirs,
)
from dataset import create_data_generators, download_dataset, create_dataloaders
from model import build_model, unfreeze_for_fine_tuning, save_model, convert_to_onnx


class EarlyStopping:
    """Early stopping to stop training when validation accuracy stops improving."""

    def __init__(self, patience=5, mode="max", verbose=True):
        self.patience = patience
        self.mode = mode
        self.verbose = verbose
        self.counter = 0
        self.best_score = None
        self.early_stop = False
        self.best_model_state = None

    def __call__(self, score, model):
        if self.best_score is None:
            self.best_score = score
            self.best_model_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
        elif (self.mode == "max" and score <= self.best_score) or \
             (self.mode == "min" and score >= self.best_score):
            self.counter += 1
            if self.verbose:
                print(f"  [EarlyStopping] No improvement: {self.counter}/{self.patience}")
            if self.counter >= self.patience:
                self.early_stop = True
        else:
            if self.verbose:
                improvement = score - self.best_score if self.mode == "max" else self.best_score - score
                print(f"  [EarlyStopping] Improved by {improvement:.4f}")
            self.best_score = score
            self.best_model_state = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            self.counter = 0

    def restore_best_weights(self, model):
        """Restore model to best weights."""
        if self.best_model_state is not None:
            model.load_state_dict({k: v.to(DEVICE) for k, v in self.best_model_state.items()})
            print(f"  [EarlyStopping] Restored best weights (val_acc={self.best_score:.4f})")


def train_one_epoch(model, train_loader, criterion, optimizer, device, epoch, writer=None):
    """
    Train for one epoch.

    Returns:
        tuple: (avg_loss, accuracy)
    """
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    progress = tqdm(train_loader, desc=f"  Epoch {epoch}", leave=False, ncols=100)

    for batch_idx, (images, labels) in enumerate(progress):
        images, labels = images.to(device), labels.to(device)

        # Forward pass
        outputs = model(images)
        loss = criterion(outputs, labels)

        # Backward pass
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        # Statistics
        running_loss += loss.item() * images.size(0)
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()

        # Update progress bar
        progress.set_postfix({
            "loss": f"{loss.item():.4f}",
            "acc": f"{100. * correct / total:.2f}%",
        })

    avg_loss = running_loss / total
    accuracy = correct / total

    if writer:
        writer.add_scalar("Train/Loss", avg_loss, epoch)
        writer.add_scalar("Train/Accuracy", accuracy, epoch)

    return avg_loss, accuracy


def validate(model, val_loader, criterion, device, epoch, writer=None):
    """
    Validate the model.

    Returns:
        tuple: (avg_loss, accuracy)
    """
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for images, labels in val_loader:
            images, labels = images.to(device), labels.to(device)

            outputs = model(images)
            loss = criterion(outputs, labels)

            running_loss += loss.item() * images.size(0)
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()

    avg_loss = running_loss / total
    accuracy = correct / total

    if writer:
        writer.add_scalar("Val/Loss", avg_loss, epoch)
        writer.add_scalar("Val/Accuracy", accuracy, epoch)

    return avg_loss, accuracy


def train(data_dir=None, use_tf_data=False):
    """
    Full training pipeline:
      1. Transfer learning (frozen backbone)
      2. Fine-tuning (unfrozen top layers)
      3. Save final model + ONNX conversion

    Args:
        data_dir: Path to dataset directory. If None, downloads automatically.
        use_tf_data: Kept for CLI compatibility (no effect in PyTorch version).

    Returns:
        tuple: (model, history_transfer, history_finetune)
    """
    ensure_dirs()

    print("=" * 70)
    print("  🌱 Crop Disease Prediction - Training Pipeline")
    print("=" * 70)
    print(f"  🖥️  Device: {DEVICE}")
    if torch.cuda.is_available():
        print(f"  🎮 GPU:    {torch.cuda.get_device_name(0)}")
        print(f"  💾 VRAM:   {torch.cuda.get_device_properties(0).total_memory / (1024**3):.1f} GB")
    print("=" * 70)

    start_time = time.time()

    # ─── Step 1: Prepare dataset ───────────────────────────────────────────
    print("\n📦 Step 1: Preparing dataset...")
    if data_dir is None:
        data_dir = download_dataset()

    train_loader, val_loader, class_names = create_data_generators(data_dir)
    num_classes = len(class_names)

    # Save class names for inference
    class_names_path = os.path.join(MODEL_DIR, "class_names.json")
    with open(class_names_path, "w") as f:
        json.dump(class_names, f, indent=2)
    print(f"  └── Saved class names to: {class_names_path}")

    # ─── Step 2: Build model ──────────────────────────────────────────────
    print("\n🏗️  Step 2: Building model...")
    model, base_features = build_model(num_classes=num_classes)

    criterion = nn.CrossEntropyLoss()

    # ─── Step 3: Transfer Learning Phase ───────────────────────────────────
    print(f"\n🎓 Step 3: Transfer Learning ({EPOCHS} epochs)...")
    print("─" * 70)

    optimizer = optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LEARNING_RATE,
    )
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=REDUCE_LR_FACTOR,
        patience=REDUCE_LR_PATIENCE, min_lr=1e-7,
    )
    early_stopping = EarlyStopping(patience=EARLY_STOPPING_PATIENCE, mode="max")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    writer_tl = SummaryWriter(os.path.join(LOGS_DIR, f"transfer_learning_{timestamp}"))

    # CSV logger
    csv_path_tl = os.path.join(RESULTS_DIR, "transfer_learning_training_log.csv")
    csv_file_tl = open(csv_path_tl, "w", newline="")
    csv_writer_tl = csv.writer(csv_file_tl)
    csv_writer_tl.writerow(["epoch", "train_loss", "train_accuracy", "val_loss", "val_accuracy", "lr"])

    history_transfer = {"loss": [], "accuracy": [], "val_loss": [], "val_accuracy": []}
    best_val_acc_tl = 0.0

    for epoch in range(1, EPOCHS + 1):
        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer, DEVICE, epoch, writer_tl
        )
        val_loss, val_acc = validate(model, val_loader, criterion, DEVICE, epoch, writer_tl)

        current_lr = optimizer.param_groups[0]["lr"]
        scheduler.step(val_loss)

        # Log
        history_transfer["loss"].append(train_loss)
        history_transfer["accuracy"].append(train_acc)
        history_transfer["val_loss"].append(val_loss)
        history_transfer["val_accuracy"].append(val_acc)
        csv_writer_tl.writerow([epoch, f"{train_loss:.4f}", f"{train_acc:.4f}",
                                f"{val_loss:.4f}", f"{val_acc:.4f}", f"{current_lr:.2e}"])
        csv_file_tl.flush()

        print(f"  Epoch {epoch:3d}/{EPOCHS} │ "
              f"Loss: {train_loss:.4f} │ Acc: {train_acc:.4f} │ "
              f"Val_Loss: {val_loss:.4f} │ Val_Acc: {val_acc:.4f} │ "
              f"LR: {current_lr:.2e}")

        # Save best model
        if val_acc > best_val_acc_tl:
            best_val_acc_tl = val_acc
            best_path = os.path.join(MODEL_DIR, f"best_transfer_learning_{MODEL_SAVE_NAME}")
            torch.save({"model_state_dict": model.state_dict()}, best_path)
            print(f"  ✅ New best model saved (val_acc={val_acc:.4f})")

        early_stopping(val_acc, model)
        if early_stopping.early_stop:
            print(f"\n  [EarlyStopping] Stopping at epoch {epoch}")
            early_stopping.restore_best_weights(model)
            break

    csv_file_tl.close()
    writer_tl.close()

    transfer_val_acc = max(history_transfer["val_accuracy"])
    print(f"\n[RESULT] Transfer Learning best val_accuracy: {transfer_val_acc:.4f}")

    # ─── Step 4: Fine-tuning Phase ─────────────────────────────────────────
    print(f"\n🔧 Step 4: Fine-tuning ({FINE_TUNE_EPOCHS} epochs)...")
    print("─" * 70)

    model = unfreeze_for_fine_tuning(model, base_features)

    optimizer_ft = optim.Adam(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=FINE_TUNE_LEARNING_RATE,
    )
    scheduler_ft = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer_ft, mode="min", factor=REDUCE_LR_FACTOR,
        patience=REDUCE_LR_PATIENCE, min_lr=1e-7,
    )
    early_stopping_ft = EarlyStopping(patience=EARLY_STOPPING_PATIENCE, mode="max")

    writer_ft = SummaryWriter(os.path.join(LOGS_DIR, f"fine_tuning_{timestamp}"))

    csv_path_ft = os.path.join(RESULTS_DIR, "fine_tuning_training_log.csv")
    csv_file_ft = open(csv_path_ft, "w", newline="")
    csv_writer_ft = csv.writer(csv_file_ft)
    csv_writer_ft.writerow(["epoch", "train_loss", "train_accuracy", "val_loss", "val_accuracy", "lr"])

    history_finetune = {"loss": [], "accuracy": [], "val_loss": [], "val_accuracy": []}
    best_val_acc_ft = 0.0

    for epoch in range(1, FINE_TUNE_EPOCHS + 1):
        global_epoch = len(history_transfer["loss"]) + epoch

        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer_ft, DEVICE, global_epoch, writer_ft
        )
        val_loss, val_acc = validate(model, val_loader, criterion, DEVICE, global_epoch, writer_ft)

        current_lr = optimizer_ft.param_groups[0]["lr"]
        scheduler_ft.step(val_loss)

        # Log
        history_finetune["loss"].append(train_loss)
        history_finetune["accuracy"].append(train_acc)
        history_finetune["val_loss"].append(val_loss)
        history_finetune["val_accuracy"].append(val_acc)
        csv_writer_ft.writerow([global_epoch, f"{train_loss:.4f}", f"{train_acc:.4f}",
                                f"{val_loss:.4f}", f"{val_acc:.4f}", f"{current_lr:.2e}"])
        csv_file_ft.flush()

        print(f"  Epoch {global_epoch:3d} │ "
              f"Loss: {train_loss:.4f} │ Acc: {train_acc:.4f} │ "
              f"Val_Loss: {val_loss:.4f} │ Val_Acc: {val_acc:.4f} │ "
              f"LR: {current_lr:.2e}")

        if val_acc > best_val_acc_ft:
            best_val_acc_ft = val_acc
            best_path = os.path.join(MODEL_DIR, f"best_fine_tuning_{MODEL_SAVE_NAME}")
            torch.save({"model_state_dict": model.state_dict()}, best_path)
            print(f"  ✅ New best model saved (val_acc={val_acc:.4f})")

        early_stopping_ft(val_acc, model)
        if early_stopping_ft.early_stop:
            print(f"\n  [EarlyStopping] Stopping at epoch {global_epoch}")
            early_stopping_ft.restore_best_weights(model)
            break

    csv_file_ft.close()
    writer_ft.close()

    finetune_val_acc = max(history_finetune["val_accuracy"])
    print(f"\n[RESULT] Fine-tuning best val_accuracy: {finetune_val_acc:.4f}")

    # ─── Step 5: Save final model ──────────────────────────────────────────
    print("\n💾 Step 5: Saving model...")
    model_path = save_model(model)

    # ─── Step 6: Convert to ONNX ──────────────────────────────────────────
    print("\n📱 Step 6: Converting to ONNX for cross-platform deployment...")
    try:
        onnx_path = convert_to_onnx(model)
    except Exception as e:
        print(f"  [WARNING] ONNX conversion failed: {e}")
        onnx_path = "N/A"

    # ─── Step 7: Save training metadata ────────────────────────────────────
    elapsed = time.time() - start_time
    metadata = {
        "timestamp": datetime.now().isoformat(),
        "training_time_seconds": round(elapsed),
        "training_time_human": f"{elapsed/3600:.1f} hours",
        "device": str(DEVICE),
        "gpu_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "num_classes": num_classes,
        "class_names": class_names,
        "transfer_learning": {
            "epochs_trained": len(history_transfer["loss"]),
            "best_val_accuracy": round(transfer_val_acc, 4),
            "final_train_accuracy": round(history_transfer["accuracy"][-1], 4),
        },
        "fine_tuning": {
            "epochs_trained": len(history_finetune["loss"]),
            "best_val_accuracy": round(finetune_val_acc, 4),
            "final_train_accuracy": round(history_finetune["accuracy"][-1], 4),
        },
        "model_path": model_path,
        "onnx_path": onnx_path,
    }

    metadata_path = os.path.join(RESULTS_DIR, "training_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    # ─── Summary ───────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("  ✅ Training Complete!")
    print("=" * 70)
    print(f"  ├── Device:              {DEVICE}")
    if torch.cuda.is_available():
        print(f"  ├── GPU:                 {torch.cuda.get_device_name(0)}")
    print(f"  ├── Total time:          {elapsed/3600:.1f} hours ({elapsed:.0f}s)")
    print(f"  ├── Transfer val_acc:    {transfer_val_acc:.4f}")
    print(f"  ├── Fine-tune val_acc:   {finetune_val_acc:.4f}")
    print(f"  ├── Model saved:         {model_path}")
    print(f"  ├── ONNX model:          {onnx_path}")
    print(f"  └── Training metadata:   {metadata_path}")
    print("=" * 70)

    # Return history as objects with .history attribute for compatibility
    class History:
        def __init__(self, h):
            self.history = h

    return model, History(history_transfer), History(history_finetune)


# ─── CLI entry point ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Train Crop Disease Prediction Model")
    parser.add_argument("--data-dir", type=str, default=None, help="Path to dataset directory")
    parser.add_argument("--use-tf-data", action="store_true", help="(Legacy flag, no effect)")
    args = parser.parse_args()

    model, h1, h2 = train(data_dir=args.data_dir, use_tf_data=args.use_tf_data)
