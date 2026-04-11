"""
Crop Disease Prediction - Flask REST API
==========================================
REST API for serving crop disease predictions over HTTP.
Designed to integrate with the KisanMitra backend.
Uses PyTorch for inference.
"""

import os
import sys
import json
import time
import traceback
from io import BytesIO

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Crop recommendation module path (loaded via importlib, NOT sys.path, to avoid name collision)
CROP_REC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'crop_recommendation')

from config import (
    API_HOST,
    API_PORT,
    MAX_CONTENT_LENGTH,
    MODEL_DIR,
    MODEL_SAVE_NAME,
    DEVICE,
    ensure_dirs,
)
from predict import CropDiseasePredictor

# ─── Flask App ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
app.config["TRAP_HTTP_EXCEPTIONS"] = True  # Route ALL errors through our JSON handlers

# Global predictor instance (loaded once at startup)
predictor = None

# Global crop recommender instance
crop_recommender = None


def get_predictor():
    """Lazy-load the predictor model."""
    global predictor
    if predictor is None:
        print("[INFO] Loading prediction model...")
        model_path = os.path.join(MODEL_DIR, MODEL_SAVE_NAME)

        # Check if we should use ONNX
        onnx_path = os.path.join(MODEL_DIR, "crop_disease_model.onnx")
        use_onnx = os.path.exists(onnx_path) and not os.path.exists(model_path)

        predictor = CropDiseasePredictor(use_tflite=use_onnx)
        print(f"[INFO] Model loaded and ready on {DEVICE}!")
    return predictor


def get_crop_recommender():
    """Lazy-load the crop recommender model."""
    global crop_recommender
    if crop_recommender is None:
        try:
            import importlib.util
            spec = importlib.util.spec_from_file_location(
                "crop_rec_predict",
                os.path.join(CROP_REC_DIR, "predict.py")
            )
            crop_rec_module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(crop_rec_module)
            crop_recommender = crop_rec_module.CropRecommender()
            crop_recommender.load()
            print("[INFO] Crop recommender model loaded!")
        except Exception as e:
            print(f"[WARN] Could not load crop recommender: {e}")
            return None
    return crop_recommender


# ─── Routes ────────────────────────────────────────────────────────────────────


@app.route("/", methods=["GET"])
def index():
    """API root - health check and info."""
    return jsonify({
        "service": "Crop Disease Prediction API",
        "version": "2.0.0",
        "status": "running",
        "device": str(DEVICE),
        "endpoints": {
            "POST /predict": "Predict disease from leaf image",
            "POST /predict/batch": "Predict diseases for multiple images",
            "POST /recommend": "Recommend crops based on soil/weather",
            "GET /classes": "List all supported disease classes",
            "GET /health": "Health check",
        },
    })


@app.route("/health", methods=["GET"])
def health_check():
    """Health check endpoint."""
    model_loaded = predictor is not None
    model_exists = os.path.exists(os.path.join(MODEL_DIR, MODEL_SAVE_NAME))

    return jsonify({
        "status": "healthy",
        "model_loaded": model_loaded,
        "model_file_exists": model_exists,
        "device": str(DEVICE),
    })


@app.route("/classes", methods=["GET"])
def get_classes():
    """Return all supported disease classes."""
    pred = get_predictor()
    classes = []
    for cls in pred.class_names:
        parts = cls.split("___")
        crop = parts[0].replace("_", " ") if len(parts) > 0 else "Unknown"
        disease = parts[1].replace("_", " ") if len(parts) > 1 else "Unknown"
        classes.append({
            "class_name": cls,
            "crop": crop,
            "disease": disease,
            "is_healthy": "healthy" in cls.lower(),
        })

    return jsonify({
        "total_classes": len(classes),
        "classes": classes,
    })


@app.route("/predict", methods=["POST"])
def predict():
    """
    Predict crop disease from an uploaded leaf image.

    Accepts:
        - multipart/form-data with 'image' file
        - JSON with 'image_base64' field (base64 encoded image)

    Returns:
        JSON with prediction results including:
        - predicted_class, confidence, crop, disease
        - disease_info (cause, symptoms, treatment, prevention)
        - top_k_predictions
    """
    start_time = time.time()

    try:
        pred = get_predictor()

        # ─── Get image from request ───────────────────────────────────────
        if request.content_type and "multipart/form-data" in request.content_type:
            # File upload
            if "image" not in request.files:
                return jsonify({
                    "error": "No image file provided",
                    "hint": "Send image as multipart/form-data with key 'image'",
                }), 400

            file = request.files["image"]
            if file.filename == "":
                return jsonify({"error": "Empty filename"}), 400

            # Validate file type
            allowed_extensions = {"jpg", "jpeg", "png", "webp", "bmp"}
            ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
            if ext not in allowed_extensions:
                return jsonify({
                    "error": f"Unsupported file type: .{ext}",
                    "allowed": list(allowed_extensions),
                }), 400

            image_bytes = file.read()

        elif request.is_json:
            # Base64 encoded image
            data = request.get_json()
            if "image_base64" not in data:
                return jsonify({
                    "error": "No image_base64 field in JSON body",
                }), 400

            import base64
            try:
                image_bytes = base64.b64decode(data["image_base64"])
            except Exception:
                return jsonify({"error": "Invalid base64 encoding"}), 400
        else:
            return jsonify({
                "error": "Unsupported content type",
                "supported": ["multipart/form-data", "application/json"],
            }), 400

        # ─── Run prediction ───────────────────────────────────────────────
        top_k = request.args.get("top_k", 5, type=int)
        result = pred.predict(image_bytes, top_k=top_k)

        # Add timing info
        inference_time = time.time() - start_time
        result["inference_time_ms"] = round(inference_time * 1000, 2)

        return jsonify({
            "success": True,
            **result,
        })

    except FileNotFoundError as e:
        return jsonify({
            "success": False,
            "error": "Model not found. Please train the model first.",
            "details": str(e),
        }), 503

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": "Prediction failed",
            "details": str(e),
        }), 500


@app.route("/predict/batch", methods=["POST"])
def predict_batch():
    """
    Predict disease for multiple images.

    Accepts multipart/form-data with multiple 'images' files.

    Returns:
        JSON with list of prediction results.
    """
    start_time = time.time()

    try:
        pred = get_predictor()

        if "images" not in request.files:
            return jsonify({
                "error": "No images provided",
                "hint": "Send images as multipart/form-data with key 'images'",
            }), 400

        files = request.files.getlist("images")
        if len(files) == 0:
            return jsonify({"error": "No files in request"}), 400

        if len(files) > 10:
            return jsonify({"error": "Maximum 10 images per batch"}), 400

        top_k = request.args.get("top_k", 3, type=int)
        results = []

        for file in files:
            try:
                image_bytes = file.read()
                result = pred.predict(image_bytes, top_k=top_k)
                result["filename"] = file.filename
                results.append(result)
            except Exception as e:
                results.append({
                    "filename": file.filename,
                    "error": str(e),
                })

        total_time = time.time() - start_time

        return jsonify({
            "success": True,
            "total_images": len(files),
            "total_time_ms": round(total_time * 1000, 2),
            "predictions": results,
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": "Batch prediction failed",
            "details": str(e),
        }), 500


# ─── Error Handlers ────────────────────────────────────────────────────────────


@app.errorhandler(413)
def too_large(e):
    return jsonify({
        "success": False,
        "error": "File too large",
        "max_size_mb": MAX_CONTENT_LENGTH / (1024 * 1024),
    }), 413


# ─── Crop Recommendation Route ─────────────────────────────────────────────────

@app.route("/recommend", methods=["POST"])
def recommend_crops():
    """
    Recommend best crops to grow based on soil and weather conditions.
    
    JSON body:
      - soil_type: str (Alluvial, Black, Red, Laterite, Sandy, Loamy)
      - temperature: float (°C)
      - humidity: float (%)
      - rainfall: float (mm)
      - nitrogen: float (optional, kg/ha)
      - phosphorus: float (optional, kg/ha)
      - potassium: float (optional, kg/ha)
      - ph: float (optional, soil pH)
    """
    try:
        rec = get_crop_recommender()
        if rec is None:
            return jsonify({
                "success": False,
                "error": "Crop recommendation model not available",
            }), 503

        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "JSON body required with soil_type, temperature, humidity, rainfall",
            }), 400

        # Required fields
        soil_type = data.get("soil_type", "Loamy")
        temperature = data.get("temperature")
        humidity = data.get("humidity")
        rainfall = data.get("rainfall")

        if temperature is None or humidity is None or rainfall is None:
            return jsonify({
                "success": False,
                "error": "temperature, humidity, and rainfall are required",
            }), 400

        # Optional soil data (falls back to soil type defaults)
        nitrogen = data.get("nitrogen")
        phosphorus = data.get("phosphorus")
        potassium = data.get("potassium")
        ph = data.get("ph")

        t0 = time.time()
        result = rec.predict_from_farm(
            soil_type=soil_type,
            temperature=float(temperature),
            humidity=float(humidity),
            rainfall=float(rainfall),
            nitrogen=float(nitrogen) if nitrogen is not None else None,
            phosphorus=float(phosphorus) if phosphorus is not None else None,
            potassium=float(potassium) if potassium is not None else None,
            ph=float(ph) if ph is not None else None,
        )
        inference_time = round((time.time() - t0) * 1000, 2)

        result["success"] = True
        result["inference_time_ms"] = inference_time
        return jsonify(result)

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
        }), 500


@app.errorhandler(404)
def not_found(e):
    return jsonify({"success": False, "error": "Endpoint not found"}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({
        "success": False,
        "error": "Internal server error",
        "details": str(e),
    }), 500


# Catch-all: ensures we NEVER return HTML, even for unhandled exceptions
@app.errorhandler(Exception)
def handle_exception(e):
    """Return JSON for any unhandled exception instead of Flask's HTML debug page."""
    traceback.print_exc()
    code = getattr(e, "code", 500)
    return jsonify({
        "success": False,
        "error": str(e),
        "type": type(e).__name__,
    }), code


# ─── Run ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("  🌱 Crop Disease Prediction API")
    print("=" * 60)
    print(f"  ├── Host:   {API_HOST}")
    print(f"  ├── Port:   {API_PORT}")
    print(f"  ├── Device: {DEVICE}")
    print(f"  └── Max upload: {MAX_CONTENT_LENGTH / (1024*1024):.0f} MB")
    print("=" * 60)

    # Pre-load model
    try:
        get_predictor()
    except Exception as e:
        print(f"[WARNING] Could not pre-load model: {e}")
        print("[INFO] Model will be loaded on first request.")

    # IMPORTANT: debug=False prevents Flask from returning HTML tracebacks
    # Use use_reloader=True for auto-restart during development
    app.run(
        host=API_HOST,
        port=API_PORT,
        debug=False,
        use_reloader=True,
    )

