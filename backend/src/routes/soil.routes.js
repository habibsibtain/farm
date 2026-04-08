import express from 'express';
import { authenticateUser } from '../middleware/auth.middleware.js';
import roleMiddleware from '../middleware/role.middleware.js';
import { addSoilData, getSoilDataByFarm } from '../controllers/soil.controller.js';

const router = express.Router();

// All soil routes require authentication
router.use(authenticateUser);

// POST /soil/:farmId — Add soil data for a farm
router.post('/:farmId', roleMiddleware('farmer'), addSoilData);

// GET /soil/:farmId — Get soil data for a farm
router.get('/:farmId', getSoilDataByFarm);

export default router;
