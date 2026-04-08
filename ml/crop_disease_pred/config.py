"""
Crop Disease Prediction - Configuration
========================================
Central configuration for all hyperparameters, paths, and settings.
"""

import os

# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DATA_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DATA_DIR = os.path.join(DATA_DIR, "processed")
MODEL_DIR = os.path.join(BASE_DIR, "models")
LOGS_DIR = os.path.join(BASE_DIR, "logs")
RESULTS_DIR = os.path.join(BASE_DIR, "results")

# ─── Dataset ──────────────────────────────────────────────────────────────────
# Using PlantVillage dataset (38 classes of crop diseases)
DATASET_NAME = "plantvillage"
KAGGLE_DATASET = "abdallahalidev/plantvillage-dataset"
NUM_CLASSES = 38

# Class names for PlantVillage dataset
CLASS_NAMES = [
    "Apple___Apple_scab",
    "Apple___Black_rot",
    "Apple___Cedar_apple_rust",
    "Apple___healthy",
    "Blueberry___healthy",
    "Cherry_(including_sour)___Powdery_mildew",
    "Cherry_(including_sour)___healthy",
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot",
    "Corn_(maize)___Common_rust_",
    "Corn_(maize)___Northern_Leaf_Blight",
    "Corn_(maize)___healthy",
    "Grape___Black_rot",
    "Grape___Esca_(Black_Measles)",
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)",
    "Grape___healthy",
    "Orange___Haunglongbing_(Citrus_greening)",
    "Peach___Bacterial_spot",
    "Peach___healthy",
    "Pepper,_bell___Bacterial_spot",
    "Pepper,_bell___healthy",
    "Potato___Early_blight",
    "Potato___Late_blight",
    "Potato___healthy",
    "Raspberry___healthy",
    "Rice___Brown_spot",
    "Rice___Leaf_blast",
    "Rice___healthy",
    "Soybean___healthy",
    "Squash___Powdery_mildew",
    "Strawberry___Leaf_scorch",
    "Strawberry___healthy",
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]

# ─── Image Settings ───────────────────────────────────────────────────────────
IMG_HEIGHT = 224
IMG_WIDTH = 224
IMG_SIZE = (IMG_HEIGHT, IMG_WIDTH)
IMG_CHANNELS = 3
INPUT_SHAPE = (IMG_HEIGHT, IMG_WIDTH, IMG_CHANNELS)

# ─── Training Hyperparameters ─────────────────────────────────────────────────
BATCH_SIZE = 32
EPOCHS = 25
LEARNING_RATE = 1e-4
FINE_TUNE_LEARNING_RATE = 1e-5
VALIDATION_SPLIT = 0.2
TEST_SPLIT = 0.1
DROPOUT_RATE = 0.3
FINE_TUNE_AT_LAYER = 100  # Unfreeze layers after this index during fine-tuning
FINE_TUNE_EPOCHS = 10
EARLY_STOPPING_PATIENCE = 5
REDUCE_LR_PATIENCE = 3
REDUCE_LR_FACTOR = 0.2

# ─── Data Augmentation ───────────────────────────────────────────────────────
AUGMENTATION_CONFIG = {
    "rotation_range": 30,
    "width_shift_range": 0.2,
    "height_shift_range": 0.2,
    "shear_range": 0.2,
    "zoom_range": 0.2,
    "horizontal_flip": True,
    "vertical_flip": False,
    "fill_mode": "nearest",
    "brightness_range": [0.8, 1.2],
}

# ─── Model Settings ──────────────────────────────────────────────────────────
MODEL_BACKBONE = "MobileNetV2"  # Lightweight, suitable for mobile deployment
MODEL_SAVE_NAME = "crop_disease_model.keras"
TFLITE_MODEL_NAME = "crop_disease_model.tflite"

# ─── API Settings ─────────────────────────────────────────────────────────────
API_HOST = "0.0.0.0"
API_PORT = 5001
MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload

# ─── Disease Info (for prediction output) ─────────────────────────────────────
DISEASE_INFO = {
    "Apple___Apple_scab": {
        "crop": "Apple",
        "disease": "Apple Scab",
        "cause": "Fungus Venturia inaequalis",
        "symptoms": "Dark, olive-green to brown lesions on leaves and fruit.",
        "treatment": "Apply fungicide sprays (captan, mancozeb). Remove infected leaves. Improve air circulation.",
        "prevention": "Plant resistant varieties. Rake and destroy fallen leaves. Prune trees for good air flow.",
    },
    "Apple___Black_rot": {
        "crop": "Apple",
        "disease": "Black Rot",
        "cause": "Fungus Botryosphaeria obtusa",
        "symptoms": "Brown spots enlarging into concentric rings on fruit. Leaf spots with purple borders.",
        "treatment": "Remove mummified fruits and dead wood. Apply fungicides during spring.",
        "prevention": "Prune cankers during dormancy. Maintain orchard sanitation.",
    },
    "Apple___Cedar_apple_rust": {
        "crop": "Apple",
        "disease": "Cedar Apple Rust",
        "cause": "Fungus Gymnosporangium juniperi-virginianae",
        "symptoms": "Yellow-orange spots on leaves. Tube-like structures on leaf undersides.",
        "treatment": "Apply fungicides (myclobutanil) at bloom and petal fall.",
        "prevention": "Remove nearby juniper/cedar trees. Plant resistant varieties.",
    },
    "Apple___healthy": {
        "crop": "Apple",
        "disease": "No Disease",
        "cause": "N/A",
        "symptoms": "Healthy plant with no visible symptoms.",
        "treatment": "No treatment needed.",
        "prevention": "Continue regular maintenance and monitoring.",
    },
    "Tomato___Late_blight": {
        "crop": "Tomato",
        "disease": "Late Blight",
        "cause": "Oomycete Phytophthora infestans",
        "symptoms": "Large, water-soaked, dark brown lesions on leaves and stems.",
        "treatment": "Apply copper-based fungicides. Remove and destroy infected plants.",
        "prevention": "Use resistant varieties. Avoid overhead irrigation. Ensure good air circulation.",
    },
    "Tomato___Early_blight": {
        "crop": "Tomato",
        "disease": "Early Blight",
        "cause": "Fungus Alternaria solani",
        "symptoms": "Dark concentric rings (target spots) on lower leaves. Yellowing around spots.",
        "treatment": "Apply chlorothalonil or copper fungicides. Remove infected leaves.",
        "prevention": "Rotate crops. Mulch around plants. Avoid overhead watering.",
    },
    "Tomato___healthy": {
        "crop": "Tomato",
        "disease": "No Disease",
        "cause": "N/A",
        "symptoms": "Healthy plant with no visible symptoms.",
        "treatment": "No treatment needed.",
        "prevention": "Continue regular maintenance and monitoring.",
    },
    "Potato___Early_blight": {
        "crop": "Potato",
        "disease": "Early Blight",
        "cause": "Fungus Alternaria solani",
        "symptoms": "Dark brown spots with concentric rings on leaves, starting from lower leaves.",
        "treatment": "Apply mancozeb or chlorothalonil fungicides. Remove affected foliage.",
        "prevention": "Use certified disease-free seed potatoes. Rotate crops every 2-3 years.",
    },
    "Potato___Late_blight": {
        "crop": "Potato",
        "disease": "Late Blight",
        "cause": "Oomycete Phytophthora infestans",
        "symptoms": "Water-soaked lesions on leaves that turn brown. White mold on leaf undersides.",
        "treatment": "Apply metalaxyl or copper-based fungicides immediately. Destroy infected plants.",
        "prevention": "Plant resistant varieties. Avoid excessive irrigation. Monitor weather conditions.",
    },
    "Potato___healthy": {
        "crop": "Potato",
        "disease": "No Disease",
        "cause": "N/A",
        "symptoms": "Healthy plant with no visible symptoms.",
        "treatment": "No treatment needed.",
        "prevention": "Continue regular maintenance and monitoring.",
    },
    "Rice___Brown_spot": {
        "crop": "Rice",
        "disease": "Brown Spot",
        "cause": "Fungus Bipolaris oryzae",
        "symptoms": "Oval brown spots on leaves, seeds may be discolored.",
        "treatment": "Apply propiconazole or iprodione fungicides. Use balanced fertilization.",
        "prevention": "Use resistant varieties. Treat seeds with fungicide before sowing. Maintain soil fertility.",
    },
    "Rice___Leaf_blast": {
        "crop": "Rice",
        "disease": "Leaf Blast",
        "cause": "Fungus Magnaporthe oryzae",
        "symptoms": "Diamond-shaped lesions with gray centers on leaves. Severe cases cause leaf death.",
        "treatment": "Apply tricyclazole or isoprothiolane fungicides. Reduce nitrogen application.",
        "prevention": "Plant resistant varieties. Avoid excessive nitrogen. Maintain proper water management.",
    },
    "Rice___healthy": {
        "crop": "Rice",
        "disease": "No Disease",
        "cause": "N/A",
        "symptoms": "Healthy plant with no visible symptoms.",
        "treatment": "No treatment needed.",
        "prevention": "Continue regular maintenance and monitoring.",
    },
}

# Generic fallback for diseases not in the detailed info
DEFAULT_DISEASE_INFO = {
    "cause": "Refer to local agricultural extension for details.",
    "symptoms": "Visible abnormalities on leaves, stems, or fruit.",
    "treatment": "Consult with a local agricultural expert for appropriate treatment.",
    "prevention": "Practice crop rotation, use resistant varieties, and maintain proper plant spacing.",
}


def ensure_dirs():
    """Create all necessary directories."""
    for dir_path in [DATA_DIR, RAW_DATA_DIR, PROCESSED_DATA_DIR, MODEL_DIR, LOGS_DIR, RESULTS_DIR]:
        os.makedirs(dir_path, exist_ok=True)
