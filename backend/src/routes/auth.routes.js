import express from 'express';

import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  requestLoginOtp,
  verifyLoginOtp,
  requestRegisterOtp,
  resendRegisterOtp,
  verifyRegisterOtp,
} from '../controllers/auth.controller.js';
import { authenticateUser } from '../middleware/auth.middleware.js';


const router = express.Router();

router.post('/register', registerUser);
router.post('/register/request-otp', requestRegisterOtp);
router.post('/register/resend-otp', resendRegisterOtp);
router.post('/register/verify-otp', verifyRegisterOtp);
router.post('/login', loginUser);
router.post('/login/request-otp', requestLoginOtp);
router.post('/login/verify-otp', verifyLoginOtp);
router.delete('/logout', authenticateUser, logoutUser);

router.get('/profile', authenticateUser, getUserProfile);

export default router;