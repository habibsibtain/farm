import axios from 'axios';

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';

/**
 * GET /price-forecast/all
 * Get price forecasts for all crops.
 */
export const getAllForecasts = async (_req, res) => {
  try {
    const mlResponse = await axios.get(`${ML_API_URL}/price-forecast/all`, {
      timeout: 10000,
    });
    return res.status(200).json(mlResponse.data);
  } catch (error) {
    console.error('[price-forecast] Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'ML price forecast service is not running.',
        hint: 'Run: python ml/crop_disease_pred/api.py',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to get price forecasts.',
      details: error.message,
    });
  }
};

/**
 * GET /price-forecast/:crop
 * Get price forecast for a specific crop.
 */
export const getCropForecast = async (req, res) => {
  try {
    const { crop } = req.params;
    const months = req.query.months || 3;

    const mlResponse = await axios.get(
      `${ML_API_URL}/price-forecast/${encodeURIComponent(crop)}?months=${months}`,
      { timeout: 10000 }
    );
    return res.status(200).json(mlResponse.data);
  } catch (error) {
    console.error('[price-forecast] Error:', error.message);
    if (error.response?.status === 404) {
      return res.status(404).json(error.response.data);
    }
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'ML price forecast service is not running.',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to get crop forecast.',
      details: error.message,
    });
  }
};
