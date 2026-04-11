import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import connectDB from './config/db.js';

dotenv.config();

const app = express();

connectDB();

// CORS configuration — allow frontend origins with credentials
const allowedOrigins = [
  'http://localhost:3000',   // Vite dev server
  'http://localhost:8081',   // Expo web
  'http://localhost:19006',  // Expo web alt port
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in dev; tighten in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import routes
import authRoutes from './routes/auth.routes.js';
import farmerRoutes from './routes/farmer.routes.js';
import advisoryRoutes from './routes/advisory.routes.js';
import soilRoutes from './routes/soil.routes.js';
import cropScanRoutes from './routes/crop-scan.routes.js';

app.use('/auth', authRoutes);
app.use('/farmer', farmerRoutes);
app.use('/advisory', advisoryRoutes);
app.use('/soil', soilRoutes);
app.use('/crop-scan', cropScanRoutes);

// Global error handler — catches unhandled errors and returns JSON
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

export default app;