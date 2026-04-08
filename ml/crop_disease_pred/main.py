#!/usr/bin/env python3
"""
Crop Disease Prediction - Main Runner
=======================================
Entry point for the entire ML pipeline.

Usage:
    python main.py --download              # Download dataset only
    python main.py --train                 # Download + Train + Evaluate
    python main.py --evaluate              # Evaluate existing model
    python main.py --predict <image_path>  # Predict a single image
    python main.py --api                   # Start the prediction API server
    python main.py --all                   # Full pipeline (download → train → evaluate)
"""

import os
import sys
import argparse

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import ensure_dirs


def run_download():
    """Download the PlantVillage dataset."""
    from dataset import download_dataset, get_dataset_stats

    print("\n" + "=" * 60)
    print("  📦 Step: Download Dataset")
    print("=" * 60)

    data_dir = download_dataset()
    get_dataset_stats(data_dir)
    return data_dir


def run_train(data_dir=None, use_tf_data=False):
    """Train the model."""
    from train import train

    print("\n" + "=" * 60)
    print("  🎓 Step: Train Model")
    print("=" * 60)

    model, h1, h2 = train(data_dir=data_dir, use_tf_data=use_tf_data)
    return model, h1, h2


def run_evaluate(model=None, data_dir=None):
    """Evaluate the model."""
    from evaluate import evaluate_model, plot_training_history

    print("\n" + "=" * 60)
    print("  📊 Step: Evaluate Model")
    print("=" * 60)

    results = evaluate_model(model=model, data_dir=data_dir)
    return results


def run_predict(image_path, model_path=None, use_tflite=False):
    """Predict a single image."""
    from predict import predict_single

    print("\n" + "=" * 60)
    print("  🔍 Step: Predict")
    print("=" * 60)

    result = predict_single(
        image_path,
        model_path=model_path,
        use_tflite=use_tflite,
        top_k=5,
    )

    # Pretty print result
    print(f"\n  🌿 Prediction Result:")
    print(f"  ├── Crop:       {result['crop']}")
    print(f"  ├── Disease:    {result['disease']}")
    print(f"  ├── Confidence: {result['confidence_percentage']}")
    print(f"  ├── Healthy:    {'✅ Yes' if result['is_healthy'] else '❌ No'}")

    if not result["is_healthy"] and "disease_info" in result:
        info = result["disease_info"]
        print(f"  ├── Cause:      {info.get('cause', 'N/A')}")
        print(f"  ├── Treatment:  {info.get('treatment', 'N/A')}")

    print(f"\n  Top predictions:")
    for i, p in enumerate(result["top_k_predictions"], 1):
        print(f"    {i}. {p['class']} ({p['confidence']*100:.2f}%)")

    return result


def run_api():
    """Start the Flask API server."""
    from api import app, get_predictor
    from config import API_HOST, API_PORT

    print("\n" + "=" * 60)
    print("  🌐 Step: Start API Server")
    print("=" * 60)

    try:
        get_predictor()
    except Exception as e:
        print(f"[WARNING] Could not pre-load model: {e}")

    app.run(host=API_HOST, port=API_PORT, debug=True)


def main():
    parser = argparse.ArgumentParser(
        description="🌱 Crop Disease Prediction ML Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main.py --all                   # Full pipeline
  python main.py --download              # Download dataset only
  python main.py --train                 # Train model
  python main.py --train --use-tf-data   # Train with tf.data (faster)
  python main.py --evaluate              # Evaluate model
  python main.py --predict leaf.jpg      # Predict single image
  python main.py --api                   # Start API server
        """,
    )

    parser.add_argument("--all", action="store_true", help="Run full pipeline")
    parser.add_argument("--download", action="store_true", help="Download dataset")
    parser.add_argument("--train", action="store_true", help="Train model")
    parser.add_argument("--evaluate", action="store_true", help="Evaluate model")
    parser.add_argument("--predict", type=str, metavar="IMAGE", help="Predict from image")
    parser.add_argument("--api", action="store_true", help="Start API server")

    parser.add_argument("--data-dir", type=str, default=None, help="Custom dataset directory")
    parser.add_argument("--model-path", type=str, default=None, help="Custom model path")
    parser.add_argument("--use-tf-data", action="store_true", help="Use tf.data pipeline")
    parser.add_argument("--tflite", action="store_true", help="Use TFLite model")

    args = parser.parse_args()

    # Default to --all if no action specified
    if not any([args.all, args.download, args.train, args.evaluate, args.predict, args.api]):
        parser.print_help()
        return

    ensure_dirs()

    print("🌱" * 30)
    print("  Crop Disease Prediction System")
    print("  KisanMitra AI - ML Pipeline")
    print("🌱" * 30)

    # ─── Run steps ─────────────────────────────────────────────────────────
    if args.all:
        data_dir = run_download()
        model, h1, h2 = run_train(data_dir=data_dir, use_tf_data=args.use_tf_data)
        run_evaluate(model=model, data_dir=data_dir)

        # Plot training history
        from evaluate import plot_training_history
        plot_training_history(h1, h2)

        print("\n" + "✅" * 30)
        print("  Full pipeline completed successfully!")
        print("✅" * 30)
        return

    if args.download:
        run_download()

    if args.train:
        model, h1, h2 = run_train(data_dir=args.data_dir, use_tf_data=args.use_tf_data)

        from evaluate import plot_training_history
        plot_training_history(h1, h2)

    if args.evaluate:
        run_evaluate(data_dir=args.data_dir)

    if args.predict:
        run_predict(args.predict, model_path=args.model_path, use_tflite=args.tflite)

    if args.api:
        run_api()


if __name__ == "__main__":
    main()
