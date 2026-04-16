import express, { type Request, type Response } from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import { autoInvalidateMiddleware, getCacheInvalidationStats } from "./utils/cacheInvalidation.js";
import { globalErrorHandler } from "./utils/asyncHandler.js";
import logger from "./utils/logger.js";

dotenv.config();
const app = express();

// Trust proxy - Required when behind reverse proxy (Railway, Render, nginx, etc.)
app.set('trust proxy', 1);

// Security middleware - Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "https://hrms-jx26.vercel.app",
  "https://hr.intakesense.com"
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Log rejected origins for debugging without throwing error
      logger.warn({ origin }, 'CORS blocked request from origin');
      callback(null, false); // Reject without throwing error
    }
  },
  credentials: true
}));

// Rate limiting
import { rateLimit } from "express-rate-limit";

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: "Too many login attempts, please try again later.",
  skipSuccessfulRequests: true,
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Document upload route BEFORE JSON middleware
import documentRoutes from "./routes/document.js";
app.use("/api/documents", documentRoutes);

// JSON middleware for all other routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 🚀 Add cache auto-invalidation middleware for performance optimization
app.use(autoInvalidateMiddleware);

// MongoDB connection with Pino logging
const connectToMongoDB = async (): Promise<void> => {
  const mongoUrl = process.env.MONGO_URL;

  if (!mongoUrl) {
    logger.error('MONGO_URL environment variable is not set');
    process.exit(1);
  }

  logger.info('Connecting to MongoDB...');

  try {
    await mongoose.connect(mongoUrl);
    logger.info('MongoDB connected successfully');
  } catch (err) {
    const error = err as Error;
    logger.error({ err: error }, "MongoDB connection failed");
    process.exit(1);
  }
};

// Initial connection attempt
connectToMongoDB();

// Connection event listeners with Pino logging
mongoose.connection.on('error', (err) => {
  logger.error({ err }, 'MongoDB error');
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

import authRoutes from "./routes/auth.js";
import employeeRoutes from "./routes/employee.js";
import attendanceRoutes from "./routes/attendance.js";
import holidayRoutes from "./routes/holiday.js";
import leaveRoutes from "./routes/leave.js";
import helpRoutes from "./routes/help.js";
import userRoutes from "./routes/user.js";
import regularizationRoutes from "./routes/regularization.js";
import passwordResetRoutes from "./routes/passwordReset.js";
import announcementRoutes from "./routes/announcement.routes.js";
import activityRoutes from "./routes/activity.js";
import dashboardRoutes from "./routes/dashboard.js";
import taskReportRoutes from "./routes/taskReport.routes.js";
import salarySlipRoutes from "./routes/salarySlip.routes.js";
import salaryStructureRoutes from "./routes/salaryStructure.routes.js";
import policyRoutes from "./routes/policy.routes.js";
import settingsRoutes from "./routes/settings.routes.js";
import healthRoutes from "./routes/health.js";
import chatRoutes from "./routes/chat.routes.js";
import officeLocationRoutes from "./routes/officeLocation.js";
import wfhRequestRoutes from "./routes/wfhRequest.js";
import notificationRoutes from "./routes/notification.routes.js";
import expenseRoutes from "./routes/expense.routes.js";

// ============================================================================
// CHRISTMAS FEATURE - Tetris Game Routes
// TODO: Remove after holiday season
// ============================================================================
import tetrisRoutes from "./features/tetris/tetris.routes.js";

// Notification Services
import NotificationService from "./services/notificationService.js";
import SchedulerService from "./services/schedulerService.js";

// API health check endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'HRMS API is working!',
    timestamp: new Date().toISOString()
  });
});

// 📊 Performance monitoring endpoint
app.get('/api/performance/cache-stats', (req: Request, res: Response) => {
  try {
    const stats = getCacheInvalidationStats();

    res.json({
      success: true,
      message: 'Cache statistics retrieved successfully',
      data: {
        ...stats,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version
      }
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cache statistics',
      error: err.message
    });
  }
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/help", helpRoutes);
app.use("/api/users", userRoutes);
app.use("/api/regularizations", regularizationRoutes); // Fixed: plural form
app.use("/api/password-reset", passwordResetRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/task-reports", taskReportRoutes); // Fixed: plural form with dash
app.use("/api/salary-slips", salarySlipRoutes);
app.use("/api/salary-structures", salaryStructureRoutes);
app.use("/api/policies", policyRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/office-locations", officeLocationRoutes);
app.use("/api/wfh-requests", wfhRequestRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/health", healthRoutes);

// ============================================================================
// CHRISTMAS FEATURE - Tetris Game API
// TODO: Remove after holiday season
// ============================================================================
app.use("/api/tetris", tetrisRoutes);

app.get('/', (req: Request, res: Response) => {
  res.send('HRMS API is working!')
})

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

const PORT = process.env.PORT || 4000;

// Initialize notification system with Pino logging
const initializeNotificationSystem = async (): Promise<void> => {
  try {
    logger.info('Initializing notification system...');

    // Initialize notification services
    await NotificationService.initialize();

    // Start scheduler for holiday reminders and milestone alerts
    SchedulerService.start();

    // Schedule daily HR attendance report
    await SchedulerService.scheduleDailyHrAttendanceReport();

    logger.info('Notification system initialized successfully');
  } catch (error) {
    logger.error({ err: error }, 'Failed to initialize notification system');
    logger.warn('Server will continue without notifications');
  }
};

// Add graceful error handling for server startup
const server = app.listen(PORT, async () => {
  logger.info(`HRMS Server running on port ${PORT}`);
  logger.info(`API Base URL: http://localhost:${PORT}/api`);

  // Initialize notification system after server starts
  await initializeNotificationSystem();
}).on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already in use. Please stop the existing server or use a different port.`);
  } else {
    logger.error({ err }, 'Server startup error');
  }
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');

  // Stop notification services
  SchedulerService.stop();

  server.close(async () => {
    logger.info('Server closed');
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error closing MongoDB connection');
      process.exit(1);
    }
  });
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');

  // Stop notification services
  SchedulerService.stop();

  server.close(async () => {
    logger.info('Server closed');
    try {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error closing MongoDB connection');
      process.exit(1);
    }
  });
});