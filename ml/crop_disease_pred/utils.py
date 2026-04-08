"""
Crop Disease Prediction - Utility Functions
=============================================
Helper functions for image processing, visualization, and misc.
"""

import os
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

from config import IMG_SIZE, RESULTS_DIR, ensure_dirs


def visualize_predictions(image_path, result, save_path=None):
    """
    Create a visual prediction output with the image and results overlay.

    Args:
        image_path: Path to the original image.
        result: Prediction result dictionary from predict().
        save_path: Where to save the visualization. If None, auto-generates.

    Returns:
        str: Path to saved visualization.
    """
    ensure_dirs()

    img = Image.open(image_path).convert("RGB")

    fig, axes = plt.subplots(1, 2, figsize=(14, 6), gridspec_kw={"width_ratios": [1, 1.2]})

    # ─── Left: Original Image ─────────────────────────────────────────────
    axes[0].imshow(img)
    axes[0].set_title("Input Leaf Image", fontsize=13, fontweight="bold")
    axes[0].axis("off")

    # Add border color based on health
    border_color = "#4CAF50" if result["is_healthy"] else "#F44336"
    for spine in axes[0].spines.values():
        spine.set_edgecolor(border_color)
        spine.set_linewidth(4)
        spine.set_visible(True)

    # ─── Right: Prediction Results ─────────────────────────────────────────
    axes[1].axis("off")

    # Title
    status_emoji = "✅" if result["is_healthy"] else "🔴"
    title = f"{status_emoji} {result['crop']} - {result['disease']}"
    axes[1].set_title(title, fontsize=14, fontweight="bold", color=border_color)

    # Top-5 predictions bar chart
    top_k = result.get("top_k_predictions", [])
    if top_k:
        labels = [p["class"].replace("___", "\n") for p in top_k]
        confidences = [p["confidence"] for p in top_k]

        # Truncate long labels
        labels = [l[:35] + "..." if len(l) > 35 else l for l in labels]

        colors = [border_color if i == 0 else "#9E9E9E" for i in range(len(top_k))]

        y_pos = np.arange(len(labels))
        bars = axes[1].barh(y_pos, confidences, color=colors, alpha=0.8, edgecolor="white")
        axes[1].set_yticks(y_pos)
        axes[1].set_yticklabels(labels, fontsize=8)
        axes[1].set_xlabel("Confidence", fontsize=11)
        axes[1].set_xlim(0, 1)
        axes[1].invert_yaxis()
        axes[1].grid(axis="x", alpha=0.3)

        # Add percentage labels on bars
        for bar, conf in zip(bars, confidences):
            axes[1].text(
                bar.get_width() + 0.01, bar.get_y() + bar.get_height() / 2,
                f"{conf*100:.1f}%", va="center", fontsize=9, fontweight="bold",
            )

    plt.tight_layout()

    if save_path is None:
        save_path = os.path.join(RESULTS_DIR, "prediction_visualization.png")

    plt.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close()

    print(f"[INFO] Visualization saved to: {save_path}")
    return save_path


def create_sample_predictions_grid(predictions, save_path=None):
    """
    Create a grid visualization of multiple predictions.

    Args:
        predictions: List of dicts, each with 'image_path' and prediction result.
        save_path: Where to save the grid.

    Returns:
        str: Path to saved grid.
    """
    ensure_dirs()

    n = len(predictions)
    cols = min(4, n)
    rows = (n + cols - 1) // cols

    fig, axes = plt.subplots(rows, cols, figsize=(5 * cols, 5 * rows))
    if rows == 1 and cols == 1:
        axes = [[axes]]
    elif rows == 1:
        axes = [axes]
    elif cols == 1:
        axes = [[ax] for ax in axes]

    for i, pred in enumerate(predictions):
        row, col = divmod(i, cols)
        ax = axes[row][col]

        if "image_path" in pred and os.path.exists(pred["image_path"]):
            img = Image.open(pred["image_path"]).convert("RGB")
            ax.imshow(img)

        if "error" in pred:
            ax.set_title(f"Error: {pred['error'][:30]}", fontsize=9, color="red")
        else:
            color = "#4CAF50" if pred.get("is_healthy", False) else "#F44336"
            ax.set_title(
                f"{pred.get('crop', '?')} - {pred.get('disease', '?')}\n"
                f"Confidence: {pred.get('confidence_percentage', '?')}",
                fontsize=9, fontweight="bold", color=color,
            )
        ax.axis("off")

    # Hide unused axes
    for i in range(n, rows * cols):
        row, col = divmod(i, cols)
        axes[row][col].axis("off")

    plt.suptitle("Crop Disease Predictions", fontsize=16, fontweight="bold")
    plt.tight_layout()

    if save_path is None:
        save_path = os.path.join(RESULTS_DIR, "predictions_grid.png")

    plt.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"[INFO] Grid saved to: {save_path}")
    return save_path


def get_sample_images(data_dir, n_per_class=1):
    """
    Get sample images from each class for testing.

    Args:
        data_dir: Path to the dataset directory.
        n_per_class: Number of images to sample per class.

    Returns:
        list: List of (image_path, class_name) tuples.
    """
    samples = []
    for class_name in sorted(os.listdir(data_dir)):
        class_path = os.path.join(data_dir, class_name)
        if not os.path.isdir(class_path):
            continue

        files = [
            f for f in os.listdir(class_path)
            if f.lower().endswith((".jpg", ".jpeg", ".png"))
        ]

        for f in files[:n_per_class]:
            samples.append((os.path.join(class_path, f), class_name))

    return samples


def format_prediction_for_app(result):
    """
    Format prediction result for the KisanMitra mobile app.

    Args:
        result: Raw prediction result dict.

    Returns:
        dict: Formatted for the mobile app's UI.
    """
    disease_info = result.get("disease_info", {})

    return {
        "status": "healthy" if result["is_healthy"] else "diseased",
        "crop": result["crop"],
        "disease": result["disease"] if not result["is_healthy"] else None,
        "confidence": result["confidence"],
        "confidence_label": _get_confidence_label(result["confidence"]),
        "icon": "✅" if result["is_healthy"] else "⚠️",
        "color": "#4CAF50" if result["is_healthy"] else "#F44336",
        "details": {
            "cause": disease_info.get("cause"),
            "symptoms": disease_info.get("symptoms"),
            "treatment": disease_info.get("treatment"),
            "prevention": disease_info.get("prevention"),
        } if not result["is_healthy"] else None,
        "alternatives": [
            {
                "name": p["class"].split("___")[-1].replace("_", " "),
                "score": p["confidence"],
            }
            for p in result.get("top_k_predictions", [])[1:4]
        ],
    }


def _get_confidence_label(confidence):
    """Convert confidence score to a human-readable label."""
    if confidence >= 0.9:
        return "Very High"
    elif confidence >= 0.7:
        return "High"
    elif confidence >= 0.5:
        return "Moderate"
    elif confidence >= 0.3:
        return "Low"
    else:
        return "Very Low"
