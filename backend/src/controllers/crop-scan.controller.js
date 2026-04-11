import axios from 'axios';
import FormData from 'form-data';

/**
 * ML API base URL — the Flask prediction server.
 * Defaults to localhost:5001 (same machine).
 */
const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

/**
 * Try to extract a meaningful error message from an axios error,
 * handling the case where the ML API returns HTML (Flask debug page)
 * instead of JSON.
 */
function extractMLError(error) {
  if (error.code === 'ECONNREFUSED') {
    return {
      status: 503,
      body: {
        success: false,
        error: 'ML prediction service is not running. Please start the Flask API.',
        hint: 'Run: python3 ml/crop_disease_pred/api.py',
      },
    };
  }

  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return {
      status: 504,
      body: {
        success: false,
        error: 'ML prediction service timed out. The model may still be loading.',
      },
    };
  }

  if (error.response) {
    const contentType = error.response.headers?.['content-type'] || '';
    const data = error.response.data;

    // If the response is JSON, use it directly
    if (contentType.includes('application/json') && typeof data === 'object') {
      return {
        status: error.response.status,
        body: {
          success: false,
          error: data.error || data.message || 'ML API returned an error.',
          details: data.details || undefined,
        },
      };
    }

    // If the response is HTML (e.g. Flask debug traceback), extract text
    if (typeof data === 'string' && data.startsWith('<')) {
      // Try to pull out the error message from the HTML
      const titleMatch = data.match(/<title>(.*?)<\/title>/i);
      const preMatch = data.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      const errorHint = titleMatch?.[1] || 'Internal ML API error';
      const traceSnippet = preMatch?.[1]?.slice(-300)?.replace(/<[^>]+>/g, '') || '';

      console.error('[crop-scan] ML API returned HTML error page:', errorHint);
      if (traceSnippet) console.error('[crop-scan] Trace:', traceSnippet);

      return {
        status: 500,
        body: {
          success: false,
          error: `ML model error: ${errorHint}`,
          details: traceSnippet || undefined,
        },
      };
    }

    // Fallback: stringify whatever we got
    return {
      status: error.response.status || 500,
      body: {
        success: false,
        error: typeof data === 'string' ? data.slice(0, 200) : 'ML API returned an unexpected response.',
      },
    };
  }

  // No response at all (network error, etc.)
  return {
    status: 500,
    body: {
      success: false,
      error: 'Failed to reach ML prediction service.',
      details: error.message,
    },
  };
}

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
      timeout: 60000, // 60s timeout for CPU inference (can be slow)
      maxContentLength: 50 * 1024 * 1024,
      // Accept any status so we can handle errors ourselves
      validateStatus: (status) => status < 500,
    });

    // Check content-type: if it's not JSON, something went wrong
    const contentType = mlResponse.headers?.['content-type'] || '';
    if (!contentType.includes('application/json')) {
      console.error('[crop-scan] ML API returned non-JSON response:', contentType);
      return res.status(500).json({
        success: false,
        error: 'ML API returned an unexpected response. The model may have an error.',
      });
    }

    // Return the ML API response directly to the frontend
    return res.status(mlResponse.status).json(mlResponse.data);
  } catch (error) {
    console.error('[crop-scan] Prediction error:', error.message);
    const { status, body } = extractMLError(error);
    return res.status(status).json(body);
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
    const { body } = extractMLError(error);
    return res.status(503).json({
      status: 'degraded',
      ml_api: 'unreachable',
      error: body.error,
    });
  }
};
