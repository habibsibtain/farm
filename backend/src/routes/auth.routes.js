import express from 'express';

import {
  registerUser,
  loginUser,
  loginWithPassword,
  logoutUser,
  getUserProfile,
} from '../controllers/auth.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/login/password', loginWithPassword);
router.post('/logout', authenticateUser, logoutUser);
router.get('/profile', authenticateUser, getUserProfile);

export default router;