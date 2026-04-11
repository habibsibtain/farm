import axios from 'axios';
import FormData from 'form-data';

/**
 * ML API base URL — the Flask prediction server.
 * Defaults to localhost:5001 (same machine).
 */
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

/**
 * POST /crop-scan/predict
 *
 * Receives a leaf image from the frontend (multipart/form-data),
 * forwards it to the Python Flask ML API, and returns the prediction.
 */
export const predictDisease = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided. Send as multipart/form-data with key "image".',
      });
    }

    // Build a new FormData to forward the image to the Flask ML API
    const form = new FormData();
    form.append('image', req.file.buffer, {
      filename: req.file.originalname || 'leaf.jpg',
      contentType: req.file.mimetype,
    });

    // Forward to Flask ML API
    const mlResponse = await axios.post(`${ML_API_URL}/predict`, form, {
      headers: {
        ...form.getHeaders(),
      },
      timeout: 30000, // 30s timeout for GPU inference
      maxContentLength: 50 * 1024 * 1024,
    });

    // Return the ML API response directly to the frontend
    return res.status(200).json(mlResponse.data);
  } catch (error) {
    console.error('[crop-scan] Prediction error:', error.message);

    // Distinguish between ML API unreachable vs other errors
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'ML prediction service is not running. Please start the Flask API.',
        hint: 'Run: python ml/crop_disease_pred/api.py',
      });
    }

    if (error.response) {
      // ML API returned an error response
      return res.status(error.response.status).json({
        success: false,
        error: error.response.data?.error || 'ML API returned an error.',
        details: error.response.data?.details,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to process crop scan.',
      details: error.message,
    });
  }
};

/**
 * GET /crop-scan/health
 *
 * Checks if the ML prediction API is running and reachable.
 */
export const cropScanHealth = async (_req, res) => {
  try {
    const mlResponse = await axios.get(`${ML_API_URL}/health`, { timeout: 5000 });
    return res.status(200).json({
      status: 'ok',
      ml_api: mlResponse.data,
    });
  } catch (error) {
    return res.status(503).json({
      status: 'degraded',
      ml_api: 'unreachable',
      error: error.message,
    });
  }
};
