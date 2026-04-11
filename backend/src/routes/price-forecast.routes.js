import express from 'express';
import { getAllForecasts, getCropForecast } from '../controllers/price-forecast.controller.js';

const router = express.Router();

// GET /price-forecast/all — get forecasts for all crops
router.get('/all', getAllForecasts);

// GET /price-forecast/:crop — get forecast for a specific crop
router.get('/:crop', getCropForecast);

export default router;
