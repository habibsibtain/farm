"""
Crop Recommendation - Training Script
======================================
Trains a Random Forest model on the Kaggle Crop Recommendation Dataset.
Features: N, P, K, temperature, humidity, ph, rainfall → crop label (22 crops)
"""

import os
import sys
import json
import time
import urllib.request
import zipfile
import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix


# ─── Paths ────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "models")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

CSV_PATH = os.path.join(DATA_DIR, "Crop_recommendation.csv")
MODEL_PATH = os.path.join(MODEL_DIR, "crop_recommendation_model.joblib")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.joblib")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.joblib")
METADATA_PATH = os.path.join(MODEL_DIR, "metadata.json")

# ─── Dataset ──────────────────────────────────────────────────────────────────
# The Kaggle Crop Recommendation Dataset
# If you have kaggle CLI: kaggle datasets download -d atharvaingle/crop-recommendation-dataset
# Otherwise we'll create the dataset inline (2200 rows, small enough)

FEATURE_COLUMNS = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
TARGET_COLUMN = "label"


def download_dataset():
    """Try to download dataset from Kaggle or use kaggle CLI."""
    if os.path.exists(CSV_PATH):
        print(f"[INFO] Dataset already exists: {CSV_PATH}")
        return True

    print("[INFO] Attempting to download dataset via Kaggle API...")
    try:
        import kaggle
        kaggle.api.dataset_download_files(
            "atharvaingle/crop-recommendation-dataset",
            path=DATA_DIR,
            unzip=True
        )
        if os.path.exists(CSV_PATH):
            print("[INFO] Dataset downloaded successfully!")
            return True
    except Exception as e:
        print(f"[WARN] Kaggle API download failed: {e}")

    # Try kaggle CLI
    try:
        os.system(f'kaggle datasets download -d atharvaingle/crop-recommendation-dataset -p "{DATA_DIR}" --unzip')
        if os.path.exists(CSV_PATH):
            print("[INFO] Dataset downloaded via CLI!")
            return True
    except Exception:
        pass

    print("[ERROR] Could not download dataset automatically.")
    print("Please download manually from:")
    print("  https://www.kaggle.com/datasets/atharvaingle/crop-recommendation-dataset")
    print(f"  Extract Crop_recommendation.csv to: {DATA_DIR}")
    return False


def generate_synthetic_dataset():
    """
    Generate a synthetic dataset based on known Indian agricultural data.
    Used as fallback when Kaggle dataset is not available.
    """
    print("[INFO] Generating synthetic crop recommendation dataset...")
    
    # Crop profiles: (N_mean, N_std, P_mean, P_std, K_mean, K_std, temp_mean, temp_std,
    #                  humidity_mean, humidity_std, ph_mean, ph_std, rainfall_mean, rainfall_std)
    crop_profiles = {
        "rice":       (80, 15, 48, 10, 40, 8, 24, 3, 82, 5, 6.5, 0.5, 240, 40),
        "maize":      (78, 12, 48, 8, 20, 5, 23, 3, 65, 8, 6.2, 0.4, 85, 20),
        "chickpea":   (40, 10, 68, 12, 80, 10, 19, 3, 17, 5, 7.0, 0.4, 80, 15),
        "kidneybeans":(20, 5, 68, 10, 20, 5, 20, 3, 22, 5, 5.8, 0.4, 105, 20),
        "pigeonpeas": (20, 5, 68, 10, 20, 5, 28, 3, 50, 8, 6.0, 0.5, 150, 30),
        "mothbeans":  (20, 5, 48, 10, 20, 5, 28, 3, 48, 8, 6.8, 0.5, 50, 15),
        "mungbean":   (20, 5, 48, 10, 20, 5, 28, 3, 85, 5, 6.5, 0.4, 50, 10),
        "blackgram":  (40, 8, 58, 10, 20, 5, 30, 3, 65, 8, 7.0, 0.4, 68, 15),
        "lentil":     (20, 5, 68, 10, 20, 5, 22, 3, 65, 5, 6.5, 0.5, 50, 10),
        "pomegranate":(20, 5, 10, 5, 40, 10, 22, 4, 90, 5, 6.5, 0.5, 110, 20),
        "banana":     (100, 15, 75, 10, 50, 10, 27, 2, 80, 5, 6.0, 0.5, 105, 20),
        "mango":      (20, 5, 28, 8, 30, 8, 32, 3, 50, 8, 5.8, 0.5, 95, 20),
        "grapes":     (20, 5, 125, 15, 200, 20, 24, 4, 82, 5, 6.0, 0.5, 70, 15),
        "watermelon": (100, 15, 10, 5, 50, 10, 25, 3, 85, 5, 6.5, 0.4, 50, 15),
        "muskmelon":  (100, 15, 10, 5, 50, 10, 28, 3, 92, 3, 6.4, 0.4, 25, 8),
        "apple":      (20, 5, 125, 15, 200, 20, 23, 3, 92, 3, 6.0, 0.5, 113, 20),
        "orange":     (20, 5, 10, 5, 10, 5, 24, 4, 92, 3, 7.0, 0.4, 110, 20),
        "papaya":     (50, 10, 58, 10, 50, 10, 34, 3, 92, 3, 6.7, 0.4, 145, 25),
        "coconut":    (20, 5, 10, 5, 30, 8, 27, 2, 95, 2, 6.0, 0.5, 175, 30),
        "cotton":     (120, 15, 46, 10, 20, 5, 24, 3, 80, 5, 7.0, 0.4, 80, 20),
        "jute":       (80, 10, 42, 8, 40, 8, 25, 2, 80, 5, 6.8, 0.4, 175, 25),
        "coffee":     (100, 15, 22, 8, 30, 8, 26, 2, 58, 8, 6.5, 0.5, 160, 30),
    }

    rows = []
    samples_per_crop = 100

    np.random.seed(42)
    for crop, params in crop_profiles.items():
        n_m, n_s, p_m, p_s, k_m, k_s, t_m, t_s, h_m, h_s, ph_m, ph_s, r_m, r_s = params
        for _ in range(samples_per_crop):
            rows.append({
                "N": max(0, np.random.normal(n_m, n_s)),
                "P": max(0, np.random.normal(p_m, p_s)),
                "K": max(0, np.random.normal(k_m, k_s)),
                "temperature": np.random.normal(t_m, t_s),
                "humidity": np.clip(np.random.normal(h_m, h_s), 10, 100),
                "ph": np.clip(np.random.normal(ph_m, ph_s), 3.5, 9.5),
                "rainfall": max(0, np.random.normal(r_m, r_s)),
                "label": crop,
            })

    df = pd.DataFrame(rows)
    df.to_csv(CSV_PATH, index=False)
    print(f"[INFO] Synthetic dataset saved: {CSV_PATH} ({len(df)} samples, {len(crop_profiles)} crops)")
    return True


def train():
    """Train the crop recommendation model."""
    print("=" * 60)
    print("  Crop Recommendation Model Training")
    print("=" * 60)

    # Step 1: Get dataset
    if not download_dataset():
        print("[INFO] Falling back to synthetic dataset generation...")
        generate_synthetic_dataset()

    # Step 2: Load data
    print(f"\n[INFO] Loading dataset from {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"  Samples: {len(df)}")
    print(f"  Features: {FEATURE_COLUMNS}")
    print(f"  Crops: {df[TARGET_COLUMN].nunique()} unique")
    print(f"  Crop list: {sorted(df[TARGET_COLUMN].unique())}")

    # Step 3: Prepare features
    X = df[FEATURE_COLUMNS].values
    y = df[TARGET_COLUMN].values

    # Encode labels
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)

    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Step 4: Split
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    print(f"\n[INFO] Train: {len(X_train)}, Test: {len(X_test)}")

    # Step 5: Train Random Forest
    print("\n[INFO] Training Random Forest...")
    t0 = time.time()
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=20,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    train_time = time.time() - t0
    print(f"  Training time: {train_time:.1f}s")

    # Step 6: Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n[INFO] Test Accuracy: {accuracy * 100:.2f}%")

    # Cross-validation
    cv_scores = cross_val_score(model, X_scaled, y_encoded, cv=5, scoring="accuracy")
    print(f"[INFO] 5-Fold CV Accuracy: {cv_scores.mean() * 100:.2f}% (+/- {cv_scores.std() * 100:.2f}%)")

    # Classification report
    class_names = label_encoder.classes_
    print("\n" + classification_report(y_test, y_pred, target_names=class_names))

    # Feature importance
    importances = model.feature_importances_
    print("[INFO] Feature Importance:")
    for feat, imp in sorted(zip(FEATURE_COLUMNS, importances), key=lambda x: -x[1]):
        print(f"  {feat:>12}: {imp:.4f} {'*' * int(imp * 50)}")

    # Step 7: Save model
    print(f"\n[INFO] Saving model to: {MODEL_PATH}")
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(label_encoder, ENCODER_PATH)

    # Save metadata
    metadata = {
        "accuracy": round(accuracy, 4),
        "cv_accuracy": round(cv_scores.mean(), 4),
        "num_crops": len(class_names),
        "crop_names": class_names.tolist(),
        "features": FEATURE_COLUMNS,
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "model_type": "RandomForest",
        "n_estimators": 200,
        "training_time_seconds": round(train_time, 2),
    }
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"[INFO] Metadata saved to: {METADATA_PATH}")

    print("\n" + "=" * 60)
    print(f"  Training complete! Accuracy: {accuracy * 100:.2f}%")
    print("=" * 60)

    return model, scaler, label_encoder


if __name__ == "__main__":
    train()
