"""
Mandi Price Prediction — Synthetic Data Generator
===================================================
Generates realistic 3-year daily price history for 15 major Indian crops.
Incorporates seasonal patterns (Kharif/Rabi), random volatility, and
gradual trends to simulate real mandi data.
"""

import os
import sys
import io
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

# Fix Windows encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

# ─── Crop Profiles ─────────────────────────────────────────────────────────────
# (base_price, volatility, seasonal_amplitude, trend_per_year, peak_month)
# base_price: ₹ per quintal
# volatility: daily random noise std (as fraction of base)
# seasonal_amplitude: seasonal swing (as fraction of base)
# trend_per_year: annual trend (as fraction of base, positive = inflation)
# peak_month: month of highest prices (1-12)

CROP_PROFILES = {
    "wheat":      {"base": 2200, "vol": 0.015, "season_amp": 0.12, "trend": 0.05, "peak": 4,  "hindi": "गेहूँ"},
    "rice":       {"base": 2000, "vol": 0.012, "season_amp": 0.10, "trend": 0.04, "peak": 11, "hindi": "धान"},
    "maize":      {"base": 1800, "vol": 0.018, "season_amp": 0.15, "trend": 0.03, "peak": 10, "hindi": "मक्का"},
    "cotton":     {"base": 5800, "vol": 0.020, "season_amp": 0.14, "trend": 0.06, "peak": 12, "hindi": "कपास"},
    "soybean":    {"base": 4000, "vol": 0.022, "season_amp": 0.18, "trend": 0.04, "peak": 11, "hindi": "सोयाबीन"},
    "sugarcane":  {"base": 350,  "vol": 0.008, "season_amp": 0.05, "trend": 0.03, "peak": 2,  "hindi": "गन्ना"},
    "onion":      {"base": 1500, "vol": 0.045, "season_amp": 0.40, "trend": 0.02, "peak": 8,  "hindi": "प्याज"},
    "tomato":     {"base": 1200, "vol": 0.055, "season_amp": 0.50, "trend": 0.01, "peak": 6,  "hindi": "टमाटर"},
    "potato":     {"base": 1000, "vol": 0.030, "season_amp": 0.25, "trend": 0.02, "peak": 7,  "hindi": "आलू"},
    "mustard":    {"base": 4800, "vol": 0.018, "season_amp": 0.12, "trend": 0.05, "peak": 3,  "hindi": "सरसों"},
    "chickpea":   {"base": 4500, "vol": 0.016, "season_amp": 0.10, "trend": 0.04, "peak": 4,  "hindi": "चना"},
    "pigeon_pea": {"base": 5800, "vol": 0.015, "season_amp": 0.08, "trend": 0.05, "peak": 12, "hindi": "अरहर"},
    "moong":      {"base": 6500, "vol": 0.020, "season_amp": 0.15, "trend": 0.04, "peak": 10, "hindi": "मूंग"},
    "urad":       {"base": 6000, "vol": 0.022, "season_amp": 0.14, "trend": 0.05, "peak": 10, "hindi": "उड़द"},
    "jowar":      {"base": 3000, "vol": 0.018, "season_amp": 0.12, "trend": 0.03, "peak": 11, "hindi": "ज्वार"},
}


def generate_price_series(crop_name, profile, years=3, end_date=None):
    """Generate a realistic daily price series for a crop."""
    if end_date is None:
        end_date = datetime.now()
    
    start_date = end_date - timedelta(days=365 * years)
    dates = pd.date_range(start=start_date, end=end_date, freq='D')
    n = len(dates)
    
    np.random.seed(hash(crop_name) % (2**31))
    
    base = profile["base"]
    vol = profile["vol"]
    season_amp = profile["season_amp"]
    trend = profile["trend"]
    peak_month = profile["peak"]
    
    prices = np.zeros(n)
    
    for i, date in enumerate(dates):
        day_frac = i / 365.25
        
        # 1. Base + trend (gradual inflation)
        trend_component = base * (1 + trend * day_frac)
        
        # 2. Seasonal pattern (sinusoidal with peak at peak_month)
        month_angle = 2 * np.pi * (date.month - peak_month) / 12
        seasonal = base * season_amp * np.cos(month_angle)
        
        # 3. Random walk volatility
        if i == 0:
            random_walk = 0
        else:
            random_walk = prices[i-1] - (base * (1 + trend * ((i-1)/365.25))) + \
                          np.random.normal(0, base * vol)
            # Mean revert slowly
            random_walk *= 0.97
        
        prices[i] = trend_component + seasonal + random_walk
        
        # Floor at 50% of base (prices don't go to zero)
        prices[i] = max(prices[i], base * 0.5)
    
    # Smooth slightly
    kernel_size = 3
    prices = np.convolve(prices, np.ones(kernel_size)/kernel_size, mode='same')
    
    df = pd.DataFrame({
        'ds': dates,
        'y': np.round(prices, 2),
        'crop': crop_name,
    })
    
    return df


def generate_all():
    """Generate price data for all crops."""
    print("=" * 60)
    print("  Generating Mandi Price Data")
    print("=" * 60)
    
    all_data = []
    
    for crop_name, profile in CROP_PROFILES.items():
        df = generate_price_series(crop_name, profile)
        csv_path = os.path.join(DATA_DIR, f"{crop_name}_prices.csv")
        df.to_csv(csv_path, index=False)
        
        print(f"  {crop_name:>12}: {len(df)} days | "
              f"Rs.{df['y'].min():.0f} - Rs.{df['y'].max():.0f} | "
              f"avg Rs.{df['y'].mean():.0f}/q")
        
        all_data.append(df)
    
    # Combined file
    combined = pd.concat(all_data, ignore_index=True)
    combined.to_csv(os.path.join(DATA_DIR, "all_crops_prices.csv"), index=False)
    
    print(f"\n[INFO] Generated {len(combined)} total records for {len(CROP_PROFILES)} crops")
    print(f"[INFO] Saved to: {DATA_DIR}")
    
    return combined


if __name__ == "__main__":
    generate_all()
