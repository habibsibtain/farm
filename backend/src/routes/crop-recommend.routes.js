import express from 'express';
import { suggestCrops, cropRecommendHealth } from '../controllers/crop-recommend.controller.js';

const router = express.Router();

// POST /crop-recommend/suggest — get crop recommendations for a farm
router.post('/suggest', suggestCrops);

// GET /crop-recommend/health — check if ML API is reachable
router.get('/health', cropRecommendHealth);

export default router;
