"""
Crop Disease Prediction - Inference Module
============================================
Single-image prediction with confidence scores and disease information.
"""

import os
import json
import numpy as np
from PIL import Image

import tensorflow as tf

from config import (
    IMG_SIZE,
    MODEL_DIR,
    MODEL_SAVE_NAME,
    CLASS_NAMES,
    DISEASE_INFO,
    DEFAULT_DISEASE_INFO,
    ensure_dirs,
)
from model import load_model


class CropDiseasePredictor:
    """
    Predictor class for crop disease classification.

    Usage:
        predictor = CropDiseasePredictor()
        result = predictor.predict("path/to/leaf_image.jpg")
        print(result)
    """

    def __init__(self, model_path=None, use_tflite=False):
        """
        Initialize the predictor.

        Args:
            model_path: Path to the trained model file.
            use_tflite: If True, use TFLite model for faster inference.
        """
        self.use_tflite = use_tflite

        # Load class names
        class_names_path = os.path.join(MODEL_DIR, "class_names.json")
        if os.path.exists(class_names_path):
            with open(class_names_path, "r") as f:
                self.class_names = json.load(f)
        else:
            self.class_names = CLASS_NAMES

        # Load model
        if use_tflite:
            self._load_tflite_model(model_path)
        else:
            self._load_keras_model(model_path)

        print(f"[INFO] Predictor initialized ({len(self.class_names)} classes)")

    def _load_keras_model(self, model_path=None):
        """Load Keras model."""
        if model_path is None:
            model_path = os.path.join(MODEL_DIR, MODEL_SAVE_NAME)
        self.model = load_model(model_path)

    def _load_tflite_model(self, model_path=None):
        """Load TFLite model for efficient inference."""
        if model_path is None:
            model_path = os.path.join(MODEL_DIR, "crop_disease_model.tflite")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"TFLite model not found: {model_path}")

        self.interpreter = tf.lite.Interpreter(model_path=model_path)
        self.interpreter.allocate_tensors()
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()
        print(f"[INFO] TFLite model loaded from: {model_path}")

    def preprocess_image(self, image_input):
        """
        Preprocess an image for prediction.

        Args:
            image_input: Can be:
                - str: Path to image file
                - PIL.Image: PIL Image object
                - np.ndarray: NumPy array (H, W, C)
                - bytes: Raw image bytes

        Returns:
            np.ndarray: Preprocessed image array of shape (1, H, W, 3).
        """
        # Handle different input types
        if isinstance(image_input, str):
            if not os.path.exists(image_input):
                raise FileNotFoundError(f"Image not found: {image_input}")
            img = Image.open(image_input).convert("RGB")
        elif isinstance(image_input, bytes):
            from io import BytesIO
            img = Image.open(BytesIO(image_input)).convert("RGB")
        elif isinstance(image_input, np.ndarray):
            img = Image.fromarray(image_input).convert("RGB")
        elif isinstance(image_input, Image.Image):
            img = image_input.convert("RGB")
        else:
            raise TypeError(f"Unsupported image type: {type(image_input)}")

        # Resize
        img = img.resize(IMG_SIZE, Image.Resampling.LANCZOS)

        # Convert to numpy and normalize
        img_array = np.array(img, dtype=np.float32) / 255.0

        # Add batch dimension
        img_array = np.expand_dims(img_array, axis=0)

        return img_array

    def predict(self, image_input, top_k=5):
        """
        Predict disease from a leaf image.

        Args:
            image_input: Image (path, PIL Image, numpy array, or bytes).
            top_k: Number of top predictions to return.

        Returns:
            dict: Prediction result containing:
                - predicted_class: Name of the predicted disease class
                - confidence: Confidence score (0-1)
                - crop: Crop name extracted from class
                - disease: Disease name extracted from class
                - disease_info: Detailed info (cause, symptoms, treatment)
                - top_k_predictions: List of top-k predictions with scores
                - is_healthy: Whether the plant is classified as healthy
        """
        # Preprocess
        img_array = self.preprocess_image(image_input)

        # Predict
        if self.use_tflite:
            self.interpreter.set_tensor(self.input_details[0]["index"], img_array)
            self.interpreter.invoke()
            predictions = self.interpreter.get_tensor(self.output_details[0]["index"])[0]
        else:
            predictions = self.model.predict(img_array, verbose=0)[0]

        # Get top-k indices
        top_k_indices = np.argsort(predictions)[::-1][:top_k]

        # Build result
        predicted_idx = top_k_indices[0]
        predicted_class = self.class_names[predicted_idx]
        confidence = float(predictions[predicted_idx])

        # Parse crop and disease from class name
        parts = predicted_class.split("___")
        crop = parts[0].replace("_", " ") if len(parts) > 0 else "Unknown"
        disease = parts[1].replace("_", " ") if len(parts) > 1 else "Unknown"

        # Get disease info
        if predicted_class in DISEASE_INFO:
            disease_info = DISEASE_INFO[predicted_class]
        else:
            disease_info = {
                "crop": crop,
                "disease": disease,
                **DEFAULT_DISEASE_INFO,
            }

        # Top-k predictions
        top_k_predictions = [
            {
                "class": self.class_names[idx],
                "confidence": round(float(predictions[idx]), 4),
            }
            for idx in top_k_indices
        ]

        result = {
            "predicted_class": predicted_class,
            "confidence": round(confidence, 4),
            "confidence_percentage": f"{confidence * 100:.2f}%",
            "crop": crop,
            "disease": disease,
            "is_healthy": "healthy" in predicted_class.lower(),
            "disease_info": disease_info,
            "top_k_predictions": top_k_predictions,
        }

        return result

    def predict_batch(self, image_paths, top_k=3):
        """
        Predict disease for multiple images.

        Args:
            image_paths: List of image paths.
            top_k: Number of top predictions per image.

        Returns:
            list: List of prediction results.
        """
        results = []
        for path in image_paths:
            try:
                result = self.predict(path, top_k=top_k)
                result["image_path"] = path
                results.append(result)
            except Exception as e:
                results.append({
                    "image_path": path,
                    "error": str(e),
                })
        return results


def predict_single(image_path, model_path=None, use_tflite=False, top_k=5):
    """
    Convenience function for single-image prediction.

    Args:
        image_path: Path to the leaf image.
        model_path: Path to model file (optional).
        use_tflite: Whether to use TFLite model.
        top_k: Number of top predictions.

    Returns:
        dict: Prediction result.
    """
    predictor = CropDiseasePredictor(model_path=model_path, use_tflite=use_tflite)
    return predictor.predict(image_path, top_k=top_k)


# ─── CLI entry point ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Predict Crop Disease from Leaf Image")
    parser.add_argument("image", type=str, help="Path to leaf image")
    parser.add_argument("--model-path", type=str, default=None, help="Path to model")
    parser.add_argument("--tflite", action="store_true", help="Use TFLite model")
    parser.add_argument("--top-k", type=int, default=5, help="Number of top predictions")
    args = parser.parse_args()

    result = predict_single(
        args.image,
        model_path=args.model_path,
        use_tflite=args.tflite,
        top_k=args.top_k,
    )

    print("\n" + "=" * 60)
    print("  🌿 Crop Disease Prediction Result")
    print("=" * 60)
    print(f"  ├── Crop:       {result['crop']}")
    print(f"  ├── Disease:    {result['disease']}")
    print(f"  ├── Confidence: {result['confidence_percentage']}")
    print(f"  ├── Healthy:    {'✅ Yes' if result['is_healthy'] else '❌ No'}")
    print(f"  └── Class:      {result['predicted_class']}")

    if not result["is_healthy"] and "disease_info" in result:
        info = result["disease_info"]
        print(f"\n{'─'*50}")
        print(f"  📋 Disease Information:")
        print(f"{'─'*50}")
        if "cause" in info:
            print(f"  ├── Cause:      {info['cause']}")
        if "symptoms" in info:
            print(f"  ├── Symptoms:   {info['symptoms']}")
        if "treatment" in info:
            print(f"  ├── Treatment:  {info['treatment']}")
        if "prevention" in info:
            print(f"  └── Prevention: {info['prevention']}")

    print(f"\n{'─'*50}")
    print(f"  🔝 Top-{args.top_k} Predictions:")
    print(f"{'─'*50}")
    for i, pred in enumerate(result["top_k_predictions"], 1):
        bar = "█" * int(pred["confidence"] * 30)
        print(f"  {i}. {pred['class']:<45} {pred['confidence']:.4f} {bar}")
