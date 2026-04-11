"""
Crop Recommendation - Prediction Module
=========================================
Loads trained model and predicts best crops for given soil/weather conditions.
"""

import os
import json
import numpy as np
import joblib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")

MODEL_PATH = os.path.join(MODEL_DIR, "crop_recommendation_model.joblib")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.joblib")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "metadata.json")

# ─── Soil Type → Default NPK Lookup ──────────────────────────────────────────
# Average N, P, K values for Indian soil types (kg/ha)
# Used when farmer hasn't entered exact soil data
SOIL_TYPE_NPK = {
    "Alluvial": {"N": 80, "P": 50, "K": 45, "ph": 7.0},
    "Black":    {"N": 60, "P": 35, "K": 55, "ph": 7.8},
    "Red":      {"N": 40, "P": 25, "K": 30, "ph": 6.0},
    "Laterite": {"N": 35, "P": 20, "K": 25, "ph": 5.5},
    "Sandy":    {"N": 25, "P": 15, "K": 20, "ph": 6.5},
    "Loamy":    {"N": 70, "P": 45, "K": 40, "ph": 6.8},
}

# ─── Season Detection ────────────────────────────────────────────────────────
# Indian agricultural seasons
def get_current_season(month=None):
    """Determine the current Indian agricultural season."""
    import datetime
    if month is None:
        month = datetime.datetime.now().month
    
    if month in [6, 7, 8, 9, 10]:  # June - October
        return "Kharif", "kharif_crops"
    elif month in [11, 12, 1, 2, 3]:  # November - March
        return "Rabi", "rabi_crops"
    else:  # April - May
        return "Zaid", "zaid_crops"

# Season-appropriate crops (for filtering/boosting)
SEASON_CROPS = {
    "kharif_crops": ["rice", "maize", "cotton", "jute", "mungbean", "mothbeans",
                     "pigeonpeas", "blackgram", "watermelon", "muskmelon", "papaya"],
    "rabi_crops": ["chickpea", "lentil", "kidneybeans", "apple", "orange",
                   "pomegranate", "grapes", "mango"],
    "zaid_crops": ["watermelon", "muskmelon", "cucumber", "papaya", "banana"],
}

# ─── Crop Info Database ──────────────────────────────────────────────────────
CROP_INFO = {
    "rice": {"hindi": "चावल / धान", "season": "Kharif", "water": "High", "duration": "120-150 days"},
    "maize": {"hindi": "मक्का", "season": "Kharif", "water": "Medium", "duration": "80-110 days"},
    "chickpea": {"hindi": "चना", "season": "Rabi", "water": "Low", "duration": "90-120 days"},
    "kidneybeans": {"hindi": "राजमा", "season": "Rabi", "water": "Medium", "duration": "90-120 days"},
    "pigeonpeas": {"hindi": "अरहर / तुअर दाल", "season": "Kharif", "water": "Low", "duration": "120-180 days"},
    "mothbeans": {"hindi": "मोठ", "season": "Kharif", "water": "Low", "duration": "60-90 days"},
    "mungbean": {"hindi": "मूंग", "season": "Kharif/Zaid", "water": "Low", "duration": "60-75 days"},
    "blackgram": {"hindi": "उड़द", "season": "Kharif", "water": "Low", "duration": "80-90 days"},
    "lentil": {"hindi": "मसूर दाल", "season": "Rabi", "water": "Low", "duration": "100-120 days"},
    "pomegranate": {"hindi": "अनार", "season": "Year-round", "water": "Low", "duration": "Perennial"},
    "banana": {"hindi": "केला", "season": "Year-round", "water": "High", "duration": "12-15 months"},
    "mango": {"hindi": "आम", "season": "Summer", "water": "Medium", "duration": "Perennial"},
    "grapes": {"hindi": "अंगूर", "season": "Rabi", "water": "Medium", "duration": "Perennial"},
    "watermelon": {"hindi": "तरबूज", "season": "Zaid", "water": "Medium", "duration": "80-90 days"},
    "muskmelon": {"hindi": "खरबूजा", "season": "Zaid", "water": "Medium", "duration": "80-90 days"},
    "apple": {"hindi": "सेब", "season": "Rabi", "water": "Medium", "duration": "Perennial"},
    "orange": {"hindi": "संतरा", "season": "Rabi", "water": "Medium", "duration": "Perennial"},
    "papaya": {"hindi": "पपीता", "season": "Year-round", "water": "Medium", "duration": "10-12 months"},
    "coconut": {"hindi": "नारियल", "season": "Year-round", "water": "High", "duration": "Perennial"},
    "cotton": {"hindi": "कपास", "season": "Kharif", "water": "Medium", "duration": "150-180 days"},
    "jute": {"hindi": "जूट / पटसन", "season": "Kharif", "water": "High", "duration": "120-150 days"},
    "coffee": {"hindi": "कॉफी", "season": "Year-round", "water": "High", "duration": "Perennial"},
}


class CropRecommender:
    """Predicts the best crops to grow based on soil and weather conditions."""

    def __init__(self):
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.metadata = None
        self._loaded = False

    def load(self):
        """Load the trained model, scaler, and label encoder."""
        if self._loaded:
            return True

        if not os.path.exists(MODEL_PATH):
            print(f"[ERROR] Model not found: {MODEL_PATH}")
            print("[INFO] Run train.py first to train the model.")
            return False

        self.model = joblib.load(MODEL_PATH)
        self.scaler = joblib.load(SCALER_PATH)
        self.label_encoder = joblib.load(ENCODER_PATH)

        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH) as f:
                self.metadata = json.load(f)

        self._loaded = True
        print(f"[INFO] Crop recommender loaded ({self.metadata['num_crops']} crops, "
              f"accuracy: {self.metadata['accuracy']*100:.1f}%)")
        return True

    def predict(self, N, P, K, temperature, humidity, ph, rainfall, top_k=5):
        """
        Predict the best crops for the given conditions.
        
        Returns list of dicts with crop name, suitability score, and info.
        """
        if not self._loaded:
            if not self.load():
                return []

        # Prepare input
        features = np.array([[N, P, K, temperature, humidity, ph, rainfall]])
        features_scaled = self.scaler.transform(features)

        # Get probabilities for all crops
        probabilities = self.model.predict_proba(features_scaled)[0]

        # Get top-k predictions
        top_indices = np.argsort(probabilities)[::-1][:top_k]

        # Get current season
        season_name, season_key = get_current_season()

        results = []
        for idx in top_indices:
            crop_name = self.label_encoder.classes_[idx]
            confidence = float(probabilities[idx])
            
            # Get crop info
            info = CROP_INFO.get(crop_name, {})
            
            # Season bonus: boost score if crop matches current season
            is_seasonal = crop_name in SEASON_CROPS.get(season_key, [])

            results.append({
                "crop": crop_name,
                "crop_hindi": info.get("hindi", crop_name),
                "suitability": round(confidence * 100, 1),
                "season": info.get("season", "Unknown"),
                "water_requirement": info.get("water", "Medium"),
                "duration": info.get("duration", "Unknown"),
                "is_seasonal": is_seasonal,
            })

        return {
            "recommendations": results,
            "current_season": season_name,
            "input_params": {
                "N": N, "P": P, "K": K,
                "temperature": temperature,
                "humidity": humidity,
                "ph": ph,
                "rainfall": rainfall,
            },
            "model_accuracy": self.metadata["accuracy"] if self.metadata else None,
        }

    def predict_from_farm(self, soil_type, temperature, humidity, rainfall,
                          nitrogen=None, phosphorus=None, potassium=None, ph=None):
        """
        Predict crops using farm data.
        Falls back to soil type defaults for missing NPK/pH values.
        """
        defaults = SOIL_TYPE_NPK.get(soil_type, SOIL_TYPE_NPK["Loamy"])

        N = nitrogen if nitrogen is not None else defaults["N"]
        P = phosphorus if phosphorus is not None else defaults["P"]
        K = potassium if potassium is not None else defaults["K"]
        ph_val = ph if ph is not None else defaults["ph"]

        return self.predict(N, P, K, temperature, humidity, ph_val, rainfall)


# Module-level instance for reuse
_recommender = None

def get_recommender():
    """Get or create the singleton recommender instance."""
    global _recommender
    if _recommender is None:
        _recommender = CropRecommender()
        _recommender.load()
    return _recommender


if __name__ == "__main__":
    # Quick test
    rec = get_recommender()
    result = rec.predict_from_farm(
        soil_type="Alluvial",
        temperature=25,
        humidity=80,
        rainfall=200,
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))
