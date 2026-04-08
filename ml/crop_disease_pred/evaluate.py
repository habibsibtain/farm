"""
Crop Disease Prediction - Evaluation Module
=============================================
Model evaluation with metrics, confusion matrix, and visualization.
"""

import os
import json
import numpy as np
import matplotlib

matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    precision_recall_fscore_support,
)

import tensorflow as tf

from config import (
    IMG_SIZE,
    BATCH_SIZE,
    RAW_DATA_DIR,
    MODEL_DIR,
    RESULTS_DIR,
    MODEL_SAVE_NAME,
    ensure_dirs,
)
from model import load_model
from dataset import create_data_generators


def evaluate_model(model=None, data_dir=None, save_plots=True):
    """
    Comprehensive model evaluation with metrics and visualizations.

    Args:
        model: Trained model. If None, loads from default path.
        data_dir: Path to dataset directory.
        save_plots: Whether to save visualization plots.

    Returns:
        dict: Evaluation metrics.
    """
    ensure_dirs()

    if model is None:
        model = load_model()

    if data_dir is None:
        data_dir = os.path.join(RAW_DATA_DIR, "color")

    print("=" * 70)
    print("  📊 Model Evaluation")
    print("=" * 70)

    # ─── Create validation generator ──────────────────────────────────────
    _, val_gen, class_names = create_data_generators(data_dir)

    # ─── Get predictions ──────────────────────────────────────────────────
    print("\n[INFO] Running predictions on validation set...")
    val_gen.reset()

    y_pred_probs = model.predict(val_gen, verbose=1)
    y_pred = np.argmax(y_pred_probs, axis=1)
    y_true = val_gen.classes[: len(y_pred)]

    # ─── Metrics ──────────────────────────────────────────────────────────
    accuracy = accuracy_score(y_true, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, average="weighted"
    )

    print(f"\n{'─'*50}")
    print(f"  Overall Metrics:")
    print(f"{'─'*50}")
    print(f"  ├── Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
    print(f"  ├── Precision: {precision:.4f}")
    print(f"  ├── Recall:    {recall:.4f}")
    print(f"  └── F1-Score:  {f1:.4f}")

    # ─── Per-class report ─────────────────────────────────────────────────
    report = classification_report(
        y_true, y_pred, target_names=class_names, output_dict=True
    )
    report_text = classification_report(
        y_true, y_pred, target_names=class_names
    )
    print(f"\n{'─'*50}")
    print("  Per-Class Report:")
    print(f"{'─'*50}")
    print(report_text)

    # ─── Save results ─────────────────────────────────────────────────────
    results = {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "num_classes": len(class_names),
        "num_samples_evaluated": len(y_true),
        "per_class_report": report,
    }

    results_path = os.path.join(RESULTS_DIR, "evaluation_results.json")
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\n[INFO] Results saved to: {results_path}")

    # ─── Visualizations ───────────────────────────────────────────────────
    if save_plots:
        plot_confusion_matrix(y_true, y_pred, class_names)
        plot_per_class_accuracy(report, class_names)
        plot_prediction_confidence(y_pred_probs, y_true, y_pred)

    return results


def plot_confusion_matrix(y_true, y_pred, class_names):
    """Plot and save the confusion matrix."""
    print("[INFO] Generating confusion matrix...")

    cm = confusion_matrix(y_true, y_pred)
    cm_normalized = cm.astype("float") / cm.sum(axis=1)[:, np.newaxis]

    fig, axes = plt.subplots(1, 2, figsize=(24, 10))

    # Raw counts
    sns.heatmap(
        cm,
        ax=axes[0],
        cmap="Blues",
        fmt="d",
        xticklabels=class_names,
        yticklabels=class_names,
    )
    axes[0].set_title("Confusion Matrix (Counts)", fontsize=14, fontweight="bold")
    axes[0].set_xlabel("Predicted", fontsize=12)
    axes[0].set_ylabel("Actual", fontsize=12)
    axes[0].tick_params(axis="x", rotation=90, labelsize=6)
    axes[0].tick_params(axis="y", rotation=0, labelsize=6)

    # Normalized
    sns.heatmap(
        cm_normalized,
        ax=axes[1],
        cmap="YlOrRd",
        fmt=".2f",
        xticklabels=class_names,
        yticklabels=class_names,
        vmin=0,
        vmax=1,
    )
    axes[1].set_title("Confusion Matrix (Normalized)", fontsize=14, fontweight="bold")
    axes[1].set_xlabel("Predicted", fontsize=12)
    axes[1].set_ylabel("Actual", fontsize=12)
    axes[1].tick_params(axis="x", rotation=90, labelsize=6)
    axes[1].tick_params(axis="y", rotation=0, labelsize=6)

    plt.tight_layout()
    save_path = os.path.join(RESULTS_DIR, "confusion_matrix.png")
    plt.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  └── Saved to: {save_path}")


def plot_per_class_accuracy(report, class_names):
    """Plot per-class precision, recall, and F1."""
    print("[INFO] Generating per-class metrics plot...")

    # Extract per-class metrics
    classes = [c for c in class_names if c in report]
    precisions = [report[c]["precision"] for c in classes]
    recalls = [report[c]["recall"] for c in classes]
    f1_scores = [report[c]["f1-score"] for c in classes]

    fig, ax = plt.subplots(figsize=(16, 8))

    x = np.arange(len(classes))
    width = 0.25

    bars1 = ax.bar(x - width, precisions, width, label="Precision", color="#2196F3", alpha=0.8)
    bars2 = ax.bar(x, recalls, width, label="Recall", color="#4CAF50", alpha=0.8)
    bars3 = ax.bar(x + width, f1_scores, width, label="F1-Score", color="#FF9800", alpha=0.8)

    ax.set_xlabel("Disease Class", fontsize=12)
    ax.set_ylabel("Score", fontsize=12)
    ax.set_title("Per-Class Classification Metrics", fontsize=14, fontweight="bold")
    ax.set_xticks(x)
    ax.set_xticklabels(classes, rotation=90, fontsize=7)
    ax.legend(fontsize=11)
    ax.set_ylim(0, 1.1)
    ax.grid(axis="y", alpha=0.3)

    plt.tight_layout()
    save_path = os.path.join(RESULTS_DIR, "per_class_metrics.png")
    plt.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  └── Saved to: {save_path}")


def plot_prediction_confidence(y_pred_probs, y_true, y_pred):
    """Plot prediction confidence distribution for correct vs incorrect."""
    print("[INFO] Generating confidence distribution plot...")

    max_probs = np.max(y_pred_probs, axis=1)
    correct_mask = y_true == y_pred

    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Correct predictions confidence
    axes[0].hist(
        max_probs[correct_mask],
        bins=50,
        color="#4CAF50",
        alpha=0.7,
        edgecolor="white",
    )
    axes[0].set_title("Confidence: Correct Predictions", fontsize=12, fontweight="bold")
    axes[0].set_xlabel("Confidence Score")
    axes[0].set_ylabel("Count")
    axes[0].axvline(x=np.mean(max_probs[correct_mask]), color="red", linestyle="--",
                     label=f"Mean: {np.mean(max_probs[correct_mask]):.3f}")
    axes[0].legend()

    # Incorrect predictions confidence
    if np.sum(~correct_mask) > 0:
        axes[1].hist(
            max_probs[~correct_mask],
            bins=50,
            color="#F44336",
            alpha=0.7,
            edgecolor="white",
        )
        axes[1].axvline(x=np.mean(max_probs[~correct_mask]), color="blue", linestyle="--",
                         label=f"Mean: {np.mean(max_probs[~correct_mask]):.3f}")
        axes[1].legend()
    axes[1].set_title("Confidence: Incorrect Predictions", fontsize=12, fontweight="bold")
    axes[1].set_xlabel("Confidence Score")
    axes[1].set_ylabel("Count")

    plt.tight_layout()
    save_path = os.path.join(RESULTS_DIR, "confidence_distribution.png")
    plt.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  └── Saved to: {save_path}")


def plot_training_history(history_transfer=None, history_finetune=None):
    """
    Plot training history curves (loss and accuracy).

    Args:
        history_transfer: History from transfer learning phase.
        history_finetune: History from fine-tuning phase.
    """
    ensure_dirs()
    print("[INFO] Generating training history plots...")

    histories = []
    labels = []

    if history_transfer:
        histories.append(history_transfer.history)
        labels.append("Transfer Learning")
    if history_finetune:
        histories.append(history_finetune.history)
        labels.append("Fine-Tuning")

    if not histories:
        print("[WARNING] No training history provided.")
        return

    fig, axes = plt.subplots(1, 2, figsize=(16, 6))

    epoch_offset = 0
    colors = ["#2196F3", "#FF9800"]

    for i, (hist, label) in enumerate(zip(histories, labels)):
        epochs = range(epoch_offset + 1, epoch_offset + len(hist["loss"]) + 1)
        color = colors[i]

        # Loss
        axes[0].plot(epochs, hist["loss"], color=color, linestyle="-", label=f"{label} - Train")
        axes[0].plot(epochs, hist["val_loss"], color=color, linestyle="--", label=f"{label} - Val")

        # Accuracy
        axes[1].plot(epochs, hist["accuracy"], color=color, linestyle="-", label=f"{label} - Train")
        axes[1].plot(epochs, hist["val_accuracy"], color=color, linestyle="--", label=f"{label} - Val")

        epoch_offset += len(hist["loss"])

    # Add vertical line between phases
    if len(histories) > 1:
        phase1_epochs = len(histories[0]["loss"])
        axes[0].axvline(x=phase1_epochs + 0.5, color="gray", linestyle=":", alpha=0.5)
        axes[1].axvline(x=phase1_epochs + 0.5, color="gray", linestyle=":", alpha=0.5)

    axes[0].set_title("Training & Validation Loss", fontsize=13, fontweight="bold")
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Loss")
    axes[0].legend()
    axes[0].grid(alpha=0.3)

    axes[1].set_title("Training & Validation Accuracy", fontsize=13, fontweight="bold")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("Accuracy")
    axes[1].legend()
    axes[1].grid(alpha=0.3)

    plt.suptitle("Training History", fontsize=15, fontweight="bold", y=1.02)
    plt.tight_layout()
    save_path = os.path.join(RESULTS_DIR, "training_history.png")
    plt.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  └── Saved to: {save_path}")


# ─── CLI entry point ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Evaluate Crop Disease Model")
    parser.add_argument("--model-path", type=str, default=None, help="Path to trained model")
    parser.add_argument("--data-dir", type=str, default=None, help="Path to dataset directory")
    args = parser.parse_args()

    if args.model_path:
        model = load_model(args.model_path)
    else:
        model = None

    evaluate_model(model=model, data_dir=args.data_dir)
