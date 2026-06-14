import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import asyncHandler from 'express-async-handler';

import config from './config.js';
import ConnectCloudinary from './config/cloudinary.js';
import ConnectDB from './config/connectMongodb.js';

import coCirculerRoutes from './routes/coCirculerRoutes.js';
import coordinaterRoutes from './routes/coordinaterRoutes.js';
import teacherRoutes from './routes/teacherRoutes.js';
import userRoutes from './routes/userRoutes.js';
import appRoutes from './routes/appRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

import logger from './notification/services/logger.js';

// =====================================
// Global Error Handlers
// =====================================

process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);

  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });

  setTimeout(() => process.exit(1), 500);
});

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled Rejection:', reason);

  logger.error('Unhandled Rejection', {
    reason: String(reason),
  });

  setTimeout(() => process.exit(1), 500);
});

// =====================================
// App Setup
// =====================================

const app = express();
app.set('logger', logger);

const port =
  config?.server?.port ||
  process.env.PORT ||
  5000;

// =====================================
// CORS Helper
// =====================================

const normalizeCorsOrigin = (originConfig) => {
  if (originConfig === true || originConfig === false) {
    return originConfig;
  }

  if (typeof originConfig !== 'string') {
    return true;
  }

  const value = originConfig.trim();

  if (!value) return true;

  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;

  if (value.includes(',')) {
    return value
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return value;
};

const corsOrigin = normalizeCorsOrigin(
  config?.cors?.origin
);

// =====================================
// Middleware
// =====================================

app.use(
  cors({
    origin: corsOrigin,
    credentials: Boolean(config?.cors?.credentials),
  })
);

app.use(cookieParser());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// =====================================
// Health Route
// =====================================

app.get(
  '/',
  asyncHandler(async (req, res) => {
    res.status(200).json({
      success: true,
      message: 'API is working',
    });
  })
);

// =====================================
// API Routes
// =====================================

app.use('/api/app', appRoutes);
app.use('/api/user', userRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/cocirculer', coCirculerRoutes);
app.use('/api/coordinater', coordinaterRoutes);
app.use('/api/health', healthRoutes);

// =====================================
// 404 Handler
// =====================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// =====================================
// Global Error Middleware
// =====================================

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);

  logger.error(err.message, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  res.status(res.statusCode >= 400 ? res.statusCode : 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// =====================================
// Service Initialization
// =====================================

const initializeServices = async () => {
  console.log('[INFO] Initializing services...');
  logger.info('Starting service initialization');

  const results = await Promise.allSettled([
    ConnectDB(),
    ConnectCloudinary(),
  ]);

  const [databaseResult, cloudinaryResult] = results;

  const failedServices = [];

  if (databaseResult.status === 'fulfilled') {
    console.log('[SUCCESS] MongoDB connected');
    logger.info('MongoDB connected');
  } else {
    failedServices.push('database');

    logger.error('Database initialization failed', {
      error:
        databaseResult.reason?.message ||
        String(databaseResult.reason),
    });
  }

  if (cloudinaryResult.status === 'fulfilled') {
    console.log('[SUCCESS] Cloudinary configured');
    logger.info('Cloudinary configured');
  } else {
    failedServices.push('cloudinary');

    logger.error('Cloudinary initialization failed', {
      error:
        cloudinaryResult.reason?.message ||
        String(cloudinaryResult.reason),
    });
  }

  if (failedServices.length > 0) {
    logger.error('Service initialization failed', {
      failedServices,
    });

    return false;
  }

  logger.info('All services initialized successfully');

  return true;
};

// =====================================
// Server Startup
// =====================================

const startServer = async () => {
  try {
    // const servicesReady =
    //   await initializeServices();

    // if (!servicesReady) {
    //   throw new Error(
    //     'Failed to initialize required services'
    //   );
    // }

    app.listen(port, () => {
      console.log(
        `[SUCCESS] Server running on port ${port}`
      );

      logger.info('Server started', {
        port,
      });
    });
  } catch (error) {
    console.error(
      '[FATAL] Failed to start server:',
      error
    );

    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });

    process.exit(1);
  }
};

startServer();