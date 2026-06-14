import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
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

// Global error handlers - log errors before process exits
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  // Ensure logs are flushed before exit
  setTimeout(() => process.exit(1), 500);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection:', reason);
  logger.error('Unhandled Rejection', { reason: String(reason), promise: String(promise) });
  // Ensure logs are flushed before exit
  setTimeout(() => process.exit(1), 500);
});

// app config
const app = express();
app.set('logger', logger);

const normalizeCorsOrigin = (originConfig) => {
    if (originConfig === true || originConfig === false) return originConfig;
    if (typeof originConfig !== 'string') return true;

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

// Initialize services (database and cloudinary) before starting server
const initializeServices = async () => {
  console.log('[INFO] Initializing services...');
  logger.info('Starting service initialization');

  const results = await Promise.allSettled([
    // ConnectDB(),
    // ConnectCloudinary(),
  ]);

  const [databaseResult, cloudinaryResult] = results;
  const failedServices = [];

  if (databaseResult.status === 'fulfilled') {
    console.log('[INFO] Database connection successful');
  } else {
    failedServices.push('database');
    logger.error('Database initialization failed', {
      error: databaseResult.reason?.message || String(databaseResult.reason),
    });
  }

  if (cloudinaryResult.status === 'fulfilled') {
    console.log('[INFO] Cloudinary configured successfully');
  } else {
    failedServices.push('cloudinary');
    logger.error('Cloudinary initialization failed', {
      error: cloudinaryResult.reason?.message || String(cloudinaryResult.reason),
    });
  }

  if (failedServices.length === 0) {
    logger.info('All services initialized successfully');
    console.log('[INFO] All services initialized successfully');
    return true;
  }

  logger.warn('Service initialization completed with failures', {
    failedServices,
  });
  console.warn('[WARN] Service initialization completed with failures:', failedServices.join(', '));
  return false;
};

const port = config.server.port
const corsOrigin = normalizeCorsOrigin(config.cors.origin);

//  middleware
app.use(cors({
    origin: corsOrigin,
    credentials: Boolean(config.cors.credentials)
}));
app.use(cookieParser());
// Parse JSON bodies (API requests)
app.use(express.json());
// Parse URL-encoded bodies (HTML forms)
app.use(express.urlencoded({ extended: true }));
//  APIs endpoints
app.use('/api/app',appRoutes);
app.use('/api/user',userRoutes);
app.use('/api/teacher',teacherRoutes)
app.use('/api/cocirculer',coCirculerRoutes)
app.use('/api/coordinater',coordinaterRoutes)
app.use('/api/health', healthRoutes)
// app.use('/api/upload/coordinater',coordinaterRoutes)
app.get('/' ,   (req,res)=>{
    res.send('Api is working')
});

// Start server only after services are initialized
const startServer = async () => {
  app.listen(port, () => {
    console.log(`[SUCCESS] Server running on port ${port}`);
    logger.info('server is started', { port });
  });

  void initializeServices().catch((error) => {
    console.error('[FATAL] Failed during background service initialization:', error);
    logger.error('Background service initialization failed', {
      error: error.message,
      stack: error.stack,
    });
  });
};

// Handle errors from the async startServer function
startServer().catch((error) => {
  console.error('[FATAL] Failed to start server:', error);
  logger.error('Failed to start server', { error: error.message, stack: error.stack });
  // Keep the process alive only for unexpected startup failures outside service initialization.
  setTimeout(() => process.exit(1), 500);
});

// Additional safeguard: catch any stderr output that might be missed
if (process.stderr && typeof process.stderr.on === 'function') {
  process.stderr.on('error', (error) => {
    console.error('[STDERR ERROR]', error);
    process.exit(1);
  });
}
