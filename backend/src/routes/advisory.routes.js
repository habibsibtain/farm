import express from 'express';
import { authenticateUser } from '../middleware/auth.middleware.js';
import roleMiddlware from '../middleware/role.middleware.js';
import { generateAdvisory, getAdvisoryHistory } from '../controllers/advisory.controller.js';

const router = express.Router();

router.post('/generate', authenticateUser, roleMiddlware("farmer"), generateAdvisory);
router.get('/history/:farmerId', authenticateUser, roleMiddlware("farmer"), getAdvisoryHistory);

export default router;