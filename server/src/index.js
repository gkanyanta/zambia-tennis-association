import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { connectDatabase } from './config/database.js';

// Load env vars
dotenv.config();

// Import jobs
import { initializeStatusUpdateJob } from './jobs/updateMembershipStatus.js';

// Create uploads directory if it doesn't exist
const uploadsDir = process.env.UPLOAD_PATH || './uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`Created uploads directory: ${uploadsDir}`);
}

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import playerRoutes from './routes/players.js';
import clubRoutes from './routes/clubs.js';
import tournamentRoutes from './routes/tournaments.js';
import newsRoutes from './routes/news.js';
import rankingRoutes from './routes/rankings.js';
import paymentRoutes from './routes/payments.js';
import membershipPaymentRoutes from './routes/membershipPayments.js';
import settingsRoutes from './routes/settings.js';
import uploadRoutes from './routes/upload.js';
import galleryRoutes from './routes/gallery.js';
import coachRoutes from './routes/coaches.js';
import coachListingRoutes from './routes/coachListings.js';
import flutterwaveRoutes from './routes/flutterwave.js';

// Initialize app
const app = express();

// Connect to database
connectDatabase();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "http://localhost:5000", "http://localhost:5173"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve static files
app.use('/uploads', express.static('uploads'));

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/membership-payments', membershipPaymentRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/coaches', coachRoutes);
app.use('/api/coach-listings', coachListingRoutes);
app.use('/api/flutterwave', flutterwaveRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server Error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);

  // Initialize automated membership status update job
  try {
    await initializeStatusUpdateJob();
  } catch (error) {
    console.error('Failed to initialize status update job:', error);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

export default app;
