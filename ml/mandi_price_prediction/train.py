"""
Mandi Price Prediction — Training Script
==========================================
Trains Facebook Prophet models for each crop's price time series.
Generates 90-day forecasts and saves models + forecast cache.
"""

import os
import sys
import io
import json
import time
import warnings

# Fix Windows encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
import numpy as np
import pandas as pd
import joblib

# Suppress Prophet's verbose output
warnings.filterwarnings('ignore')
import logging
logging.getLogger('prophet').setLevel(logging.WARNING)
logging.getLogger('cmdstanpy').setLevel(logging.WARNING)

from prophet import Prophet

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# Import crop profiles from data generator
sys.path.insert(0, BASE_DIR)
from generate_data import CROP_PROFILES, generate_all


def train_crop_model(crop_name, df):
    """Train a Prophet model for a single crop."""
    # Prepare data (Prophet needs 'ds' and 'y' columns)
    prophet_df = df[['ds', 'y']].copy()
    prophet_df['ds'] = pd.to_datetime(prophet_df['ds'])
    
    # Train/test split (last 30 days as test)
    train = prophet_df[:-30]
    test = prophet_df[-30:]
    
    # Create and fit Prophet model
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=False,
        daily_seasonality=False,
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10,
        interval_width=0.80,
    )
    model.fit(train)
    
    # Evaluate on test set
    test_forecast = model.predict(test[['ds']])
    test_actual = test['y'].values
    test_predicted = test_forecast['yhat'].values
    
    mae = np.mean(np.abs(test_actual - test_predicted))
    mape = np.mean(np.abs((test_actual - test_predicted) / test_actual)) * 100
    
    # Generate 90-day (3 month) future forecast
    future = model.make_future_dataframe(periods=90, freq='D')
    forecast = model.predict(future)
    
    # Extract only future predictions
    last_date = prophet_df['ds'].max()
    future_forecast = forecast[forecast['ds'] > last_date].copy()
    
    return model, future_forecast, mae, mape


def train_all():
    """Train models for all crops."""
    print("=" * 60)
    print("  Mandi Price Prediction — Model Training")
    print("=" * 60)
    
    # Step 1: Generate data if not exists
    all_csv = os.path.join(DATA_DIR, "all_crops_prices.csv")
    if not os.path.exists(all_csv):
        print("\n[INFO] Generating price data first...")
        generate_all()
    
    # Step 2: Train models
    all_forecasts = {}
    metadata = {"crops": {}, "trained_at": time.strftime("%Y-%m-%d %H:%M")}
    
    total_time = 0
    
    for crop_name, profile in CROP_PROFILES.items():
        csv_path = os.path.join(DATA_DIR, f"{crop_name}_prices.csv")
        df = pd.read_csv(csv_path)
        
        print(f"\n[TRAIN] {crop_name}...", end=" ", flush=True)
        t0 = time.time()
        
        model, forecast, mae, mape = train_crop_model(crop_name, df)
        
        train_time = time.time() - t0
        total_time += train_time
        
        # Save model
        model_path = os.path.join(MODEL_DIR, f"{crop_name}_prophet.joblib")
        joblib.dump(model, model_path)
        
        # Build monthly summary from forecast
        forecast['month'] = pd.to_datetime(forecast['ds']).dt.to_period('M')
        monthly = forecast.groupby('month').agg({
            'yhat': 'mean',
            'yhat_lower': 'mean',
            'yhat_upper': 'mean',
        }).reset_index()
        
        monthly_data = []
        for _, row in monthly.iterrows():
            monthly_data.append({
                "month": str(row['month']),
                "predicted_price": round(float(row['yhat']), 2),
                "price_low": round(float(row['yhat_lower']), 2),
                "price_high": round(float(row['yhat_upper']), 2),
            })
        
        # Get current price (last data point)
        current_price = float(df['y'].iloc[-1])
        last_predicted = monthly_data[-1]["predicted_price"] if monthly_data else current_price
        
        # Calculate trend
        price_change = ((last_predicted - current_price) / current_price) * 100
        if price_change > 3:
            trend = "UP"
        elif price_change < -3:
            trend = "DOWN"
        else:
            trend = "STABLE"
        
        all_forecasts[crop_name] = {
            "crop": crop_name,
            "crop_hindi": profile["hindi"],
            "current_price": round(current_price, 2),
            "trend": trend,
            "price_change_pct": round(price_change, 1),
            "monthly_forecast": monthly_data,
            "mae": round(mae, 2),
            "mape": round(mape, 2),
        }
        
        metadata["crops"][crop_name] = {
            "mae": round(mae, 2),
            "mape": round(mape, 2),
            "train_time": round(train_time, 2),
            "current_price": round(current_price, 2),
            "trend": trend,
        }
        
        print(f"OK {train_time:.1f}s | MAE: Rs.{mae:.0f} | MAPE: {mape:.1f}% | Trend: {trend}")
    
    # Save forecasts cache
    forecast_path = os.path.join(MODEL_DIR, "forecasts.json")
    with open(forecast_path, "w", encoding="utf-8") as f:
        json.dump(all_forecasts, f, indent=2, ensure_ascii=False)
    
    # Save metadata
    metadata["total_training_time"] = round(total_time, 2)
    metadata_path = os.path.join(MODEL_DIR, "metadata.json")
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*60}")
    print(f"  Training complete! {len(CROP_PROFILES)} models in {total_time:.1f}s")
    print(f"  Forecasts saved: {forecast_path}")
    print(f"{'='*60}")
    
    return all_forecasts


if __name__ == "__main__":
    train_all()
