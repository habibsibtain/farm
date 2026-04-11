"""
Mandi Price Prediction — Prediction Module
============================================
Loads cached forecasts and serves predictions via the Flask API.
"""

import os
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")
FORECASTS_PATH = os.path.join(MODEL_DIR, "forecasts.json")
METADATA_PATH = os.path.join(MODEL_DIR, "metadata.json")


class MandiPricePredictor:
    """Serves pre-computed mandi price forecasts."""

    def __init__(self):
        self.forecasts = None
        self.metadata = None
        self._loaded = False

    def load(self):
        """Load cached forecasts."""
        if self._loaded:
            return True

        if not os.path.exists(FORECASTS_PATH):
            print(f"[ERROR] Forecasts not found: {FORECASTS_PATH}")
            print("[INFO] Run train.py first to train models and generate forecasts.")
            return False

        with open(FORECASTS_PATH, "r", encoding="utf-8") as f:
            self.forecasts = json.load(f)

        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

        self._loaded = True
        print(f"[INFO] Mandi price predictor loaded ({len(self.forecasts)} crops)")
        return True

    def get_forecast(self, crop_name, months=3):
        """Get price forecast for a specific crop."""
        if not self._loaded:
            if not self.load():
                return None

        crop_key = crop_name.lower().strip().replace(" ", "_")
        
        if crop_key not in self.forecasts:
            return None

        result = self.forecasts[crop_key].copy()
        
        # Limit months
        if months < len(result["monthly_forecast"]):
            result["monthly_forecast"] = result["monthly_forecast"][:months]

        # Add advisory
        trend = result["trend"]
        change = result["price_change_pct"]
        
        if trend == "UP":
            result["advisory"] = "hold"
            result["advisory_text"] = "Prices are expected to rise. Consider holding your stock."
            result["advisory_text_hindi"] = "कीमतें बढ़ने की उम्मीद है। अपना स्टॉक रखें।"
        elif trend == "DOWN":
            result["advisory"] = "sell"
            result["advisory_text"] = "Prices may decline. Consider selling soon."
            result["advisory_text_hindi"] = "कीमतें गिर सकती हैं। जल्दी बेचने पर विचार करें।"
        else:
            result["advisory"] = "wait"
            result["advisory_text"] = "Prices are stable. No rush to sell."
            result["advisory_text_hindi"] = "कीमतें स्थिर हैं। बेचने की जल्दी नहीं है।"

        # Find best selling month
        if result["monthly_forecast"]:
            best_month = max(result["monthly_forecast"], 
                          key=lambda x: x["predicted_price"])
            result["best_sell_month"] = best_month["month"]
            result["best_sell_price"] = best_month["predicted_price"]

        return result

    def get_all_forecasts(self):
        """Get summary forecasts for all crops."""
        if not self._loaded:
            if not self.load():
                return []

        summaries = []
        for crop_key, data in self.forecasts.items():
            forecast = self.get_forecast(crop_key)
            if forecast:
                summaries.append({
                    "crop": forecast["crop"],
                    "crop_hindi": forecast["crop_hindi"],
                    "current_price": forecast["current_price"],
                    "trend": forecast["trend"],
                    "price_change_pct": forecast["price_change_pct"],
                    "advisory": forecast.get("advisory", "wait"),
                    "advisory_text": forecast.get("advisory_text", ""),
                    "advisory_text_hindi": forecast.get("advisory_text_hindi", ""),
                    "monthly_forecast": forecast["monthly_forecast"],
                })

        return summaries

    def get_available_crops(self):
        """Return list of available crops."""
        if not self._loaded:
            self.load()
        return list(self.forecasts.keys()) if self.forecasts else []


# Singleton
_predictor = None

def get_predictor():
    global _predictor
    if _predictor is None:
        _predictor = MandiPricePredictor()
        _predictor.load()
    return _predictor


if __name__ == "__main__":
    pred = get_predictor()
    
    # Test single crop
    result = pred.get_forecast("wheat")
    if result:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # Test all crops summary
    print(f"\nAvailable crops: {pred.get_available_crops()}")
