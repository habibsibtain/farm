import axios from 'axios';

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:5001';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'e745bb0c8c66a8872c64e15f8e49da29';

/**
 * POST /crop-recommend/suggest
 *
 * Takes farm details from the frontend, fetches weather data for the
 * farm's location, calls the ML API for crop recommendations.
 */
export const suggestCrops = async (req, res) => {
  try {
    const {
      soil_type,
      state,
      district,
      land_size,
      irrigation_type,
      crops_grown,
      // Optional soil data
      nitrogen,
      phosphorus,
      potassium,
      ph,
    } = req.body;

    if (!soil_type || !state) {
      return res.status(400).json({
        success: false,
        error: 'soil_type and state are required.',
      });
    }

    // Step 1: Fetch weather data for the location
    let temperature = 25;
    let humidity = 70;
    let rainfall = 100;

    try {
      const location = `${district || ''} ${state}, India`.trim();
      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${WEATHER_API_KEY}&units=metric`;
      const weatherRes = await axios.get(weatherUrl, { timeout: 5000 });
      const weatherData = weatherRes.data;

      temperature = weatherData.main?.temp || 25;
      humidity = weatherData.main?.humidity || 70;

      // Estimate monthly rainfall from current conditions
      // (rain.1h if available, otherwise estimate from humidity)
      if (weatherData.rain?.['1h']) {
        rainfall = weatherData.rain['1h'] * 24 * 30; // rough monthly estimate
      } else if (weatherData.rain?.['3h']) {
        rainfall = weatherData.rain['3h'] * 8 * 30;
      } else {
        // Estimate from humidity and season
        rainfall = humidity > 80 ? 200 : humidity > 60 ? 100 : 50;
      }

      console.log(`[crop-recommend] Weather for ${location}: ${temperature}°C, ${humidity}%, rainfall ~${rainfall}mm`);
    } catch (weatherError) {
      console.warn('[crop-recommend] Weather API failed, using defaults:', weatherError.message);
    }

    // Step 2: Call ML API for crop recommendations
    const mlPayload = {
      soil_type,
      temperature,
      humidity,
      rainfall,
      ...(nitrogen != null && { nitrogen: Number(nitrogen) }),
      ...(phosphorus != null && { phosphorus: Number(phosphorus) }),
      ...(potassium != null && { potassium: Number(potassium) }),
      ...(ph != null && { ph: Number(ph) }),
    };

    const mlResponse = await axios.post(`${ML_API_URL}/recommend`, mlPayload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    const mlResult = mlResponse.data;

    // Step 3: Add context
    const result = {
      ...mlResult,
      weather: {
        temperature: Math.round(temperature),
        humidity: Math.round(humidity),
        rainfall: Math.round(rainfall),
        location: `${district || ''}, ${state}`.replace(/^, /, ''),
      },
      farm_context: {
        soil_type,
        land_size,
        irrigation_type,
        current_crops: crops_grown,
      },
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('[crop-recommend] Error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'ML recommendation service is not running.',
        hint: 'Run: python ml/crop_disease_pred/api.py',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to generate crop recommendations.',
      details: error.message,
    });
  }
};

/**
 * GET /crop-recommend/health
 */
export const cropRecommendHealth = async (_req, res) => {
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
