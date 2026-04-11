import express from 'express';
import multer from 'multer';
import { predictDisease, cropScanHealth } from '../controllers/crop-scan.controller.js';

const router = express.Router();

// Store uploaded files in memory (we forward them immediately)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 }, // 16 MB
  fileFilter: (_req, file, cb) => {
    // Accept any image type — the ML API validates the content
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

// POST /crop-scan/predict — upload a leaf image, get disease prediction
router.post('/predict', upload.single('image'), predictDisease);

// GET /crop-scan/health — check if ML API is reachable
router.get('/health', cropScanHealth);

export default router;
