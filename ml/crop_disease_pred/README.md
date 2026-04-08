# 🌱 Crop Disease Prediction - ML Module

A complete machine learning system for identifying **38 types of crop diseases** from leaf images, built for the **KisanMitra AI** platform.

## 📋 Overview

This module uses **Transfer Learning** with **MobileNetV2** (pre-trained on ImageNet) to classify plant leaf images into 38 disease categories across 14 crop species using the [PlantVillage Dataset](https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset).

### Supported Crops & Diseases

| Crop | Diseases |
|------|----------|
| 🍎 Apple | Apple Scab, Black Rot, Cedar Apple Rust, Healthy |
| 🫐 Blueberry | Healthy |
| 🍒 Cherry | Powdery Mildew, Healthy |
| 🌽 Corn | Cercospora Leaf Spot, Common Rust, Northern Leaf Blight, Healthy |
| 🍇 Grape | Black Rot, Esca, Leaf Blight, Healthy |
| 🍊 Orange | Huanglongbing (Citrus Greening) |
| 🍑 Peach | Bacterial Spot, Healthy |
| 🫑 Pepper | Bacterial Spot, Healthy |
| 🥔 Potato | Early Blight, Late Blight, Healthy |
| 🫐 Raspberry | Healthy |
| 🌾 Rice | Brown Spot, Leaf Blast, Healthy |
| 🫘 Soybean | Healthy |
| 🍓 Strawberry | Leaf Scorch, Healthy |
| 🍅 Tomato | 10 diseases + Healthy |

## 🏗️ Architecture

```
MobileNetV2 (ImageNet) → GlobalAvgPool → BatchNorm → Dense(256) → Dropout → Dense(128) → Dropout → Softmax(38)
```

### Training Strategy
1. **Transfer Learning**: Freeze MobileNetV2, train classification head (25 epochs)
2. **Fine-Tuning**: Unfreeze top layers, train with lower LR (10 epochs)

## 📁 Project Structure

```
ml/crop_disease_pred/
├── config.py          # All hyperparameters, paths, disease info
├── dataset.py         # Data download, preprocessing, augmentation
├── model.py           # MobileNetV2 model architecture
├── train.py           # Training pipeline with callbacks
├── evaluate.py        # Metrics, confusion matrix, visualizations
├── predict.py         # Single/batch image inference
├── api.py             # Flask REST API server
├── utils.py           # Visualization & formatting helpers
├── main.py            # CLI entry point for full pipeline
├── requirements.txt   # Python dependencies
├── README.md          # This file
│
├── data/              # (auto-created)
│   ├── raw/           # Downloaded PlantVillage dataset
│   └── processed/     # Preprocessed data
├── models/            # (auto-created) Saved models
├── results/           # (auto-created) Evaluation results & plots
└── logs/              # (auto-created) TensorBoard logs
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ml/crop_disease_pred
pip install -r requirements.txt
```

### 2. Run Full Pipeline (Download → Train → Evaluate)

```bash
python main.py --all
```

### 3. Or Run Steps Individually

```bash
# Download dataset
python main.py --download

# Train model
python main.py --train

# Train with tf.data (faster on GPU)
python main.py --train --use-tf-data

# Evaluate model
python main.py --evaluate

# Predict single image
python main.py --predict path/to/leaf_image.jpg

# Start API server
python main.py --api
```

## 🌐 REST API

Start the prediction API:

```bash
python main.py --api
# or
python api.py
```

The API runs on `http://localhost:5001` by default.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API info & health |
| `GET` | `/health` | Health check |
| `GET` | `/classes` | List all 38 disease classes |
| `POST` | `/predict` | Predict disease from image |
| `POST` | `/predict/batch` | Batch prediction (max 10) |

### Example: Predict via cURL

```bash
# File upload
curl -X POST -F "image=@leaf_photo.jpg" http://localhost:5001/predict

# Base64 JSON
curl -X POST -H "Content-Type: application/json" \
  -d '{"image_base64": "<base64_string>"}' \
  http://localhost:5001/predict
```

### Example Response

```json
{
  "success": true,
  "predicted_class": "Tomato___Late_blight",
  "confidence": 0.9542,
  "confidence_percentage": "95.42%",
  "crop": "Tomato",
  "disease": "Late blight",
  "is_healthy": false,
  "disease_info": {
    "crop": "Tomato",
    "disease": "Late Blight",
    "cause": "Oomycete Phytophthora infestans",
    "symptoms": "Large, water-soaked, dark brown lesions on leaves and stems.",
    "treatment": "Apply copper-based fungicides. Remove and destroy infected plants.",
    "prevention": "Use resistant varieties. Avoid overhead irrigation."
  },
  "top_k_predictions": [
    {"class": "Tomato___Late_blight", "confidence": 0.9542},
    {"class": "Tomato___Early_blight", "confidence": 0.0213},
    {"class": "Potato___Late_blight", "confidence": 0.0098}
  ],
  "inference_time_ms": 145.23
}
```

## 🔗 Integration with KisanMitra Backend

To integrate with the Node.js backend, you can:

1. **Run as a microservice**: Start `api.py` alongside the Node.js backend
2. **Call from Node.js**:

```javascript
// In your Node.js backend controller
const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');

async function predictDisease(imagePath) {
  const form = new FormData();
  form.append('image', fs.createReadStream(imagePath));

  const response = await axios.post('http://localhost:5001/predict', form, {
    headers: form.getHeaders(),
  });

  return response.data;
}
```

## 📱 Mobile Deployment

The pipeline automatically exports a **TFLite** model for on-device inference:

```
models/crop_disease_model.tflite  (~10 MB quantized)
```

This can be used in React Native with `@tensorflow/tfjs-react-native`.

## 📊 Expected Performance

| Metric | Score |
|--------|-------|
| Accuracy | ~95-97% |
| Top-3 Accuracy | ~99% |
| F1-Score (weighted) | ~0.96 |
| Inference Time | ~100-200ms (GPU) |
| TFLite Model Size | ~10 MB |

## ⚙️ Configuration

All hyperparameters are in `config.py`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `IMG_SIZE` | 224×224 | Input image dimensions |
| `BATCH_SIZE` | 32 | Training batch size |
| `EPOCHS` | 25 | Transfer learning epochs |
| `FINE_TUNE_EPOCHS` | 10 | Fine-tuning epochs |
| `LEARNING_RATE` | 1e-4 | Initial learning rate |
| `DROPOUT_RATE` | 0.3 | Dropout for regularization |
| `API_PORT` | 5001 | Flask API port |

## 📝 License

Part of the KisanMitra AI project.
