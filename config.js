import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './notification/services/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend root regardless of current working directory.
dotenv.config({ path: path.resolve(__dirname, '.env') });

const smtpHost = String(process.env.SMTP_HOST || '').trim();
const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
const smtpUser = String(process.env.SMTP_USER || '').trim();
const smtpPass = String(process.env.SMTP_PASS || '').trim();
const smtpFrom = String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim();

const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT),
    nodeEnv: process.env.NODE_ENV
  },

  // Database Configuration
  database: {
    mongodbUri: process.env.MONGODB_URI ,
    dbName: process.env.MONGODB_DB_NAME || 'koshish',
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || process.env.JWT_SECKRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // Cloudinary Configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'koshish',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },

  // SMTP/Email Configuration
  email: {
    smtp: {
      host: smtpHost || 'smtp.gmail.com',
      port: smtpPort,
      user: smtpUser,
      pass: smtpPass,
      from: smtpFrom,
    },
    queue: {
      provider: 'bullmq',
      queueName: String(process.env.EMAIL_QUEUE_NAME || 'email-notifications').trim(),
      redisUrl: String(process.env.REDIS_URL || '').trim(),
      redisHost: String(process.env.REDIS_HOST || '').trim(),
      redisPort: parseInt(process.env.REDIS_PORT, 10) || 6379,
      redisUsername: String(process.env.REDIS_USERNAME || '').trim(),
      redisPassword: String(process.env.REDIS_PASSWORD || '').trim(),
      redisTls: String(process.env.REDIS_TLS || '').trim().toLowerCase() === 'true',
      attempts: parseInt(process.env.EMAIL_QUEUE_ATTEMPTS, 10) || 3,
      backoffDelayMs: parseInt(process.env.EMAIL_QUEUE_BACKOFF_DELAY_MS, 10) || 5000,
      removeOnComplete: parseInt(process.env.EMAIL_QUEUE_REMOVE_ON_COMPLETE, 10) || 1000,
      removeOnFail: parseInt(process.env.EMAIL_QUEUE_REMOVE_ON_FAIL, 10) || 5000,
    },
    isConfigured: Boolean(smtpHost && smtpPort && smtpUser && smtpPass),
  },

  // Authentication Credentials
  // Only coordinator has default credentials
  // Co-curricular, Teacher, and Student are onboarded dynamically and credentials are stored in database
  auth: {
    coordinator: {
      username: process.env.COORDINATOR_USERNAME,
      password: process.env.COORDINATOR_PASSWORD ,
      notifyEmail: process.env.COORDINATOR_NOTIFY_EMAIL || '',
    },
  },
  
  // Onboarding Configuration
  onboarding: {
    credentialEmailRequired: true,
    maxLoginAttempts: 5,
    lockoutDuration: 900000,
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  },

  // Frontend URLs
  frontend: {
    studentUrl: process.env.STUDENT_FRONTEND_URL,
    adminUrl: process.env.ADMIN_FRONTEND_URL,
  },
};

// Validate required configurations in production
if (config.server.nodeEnv === 'production') {
  const requiredKeys = [
    'database.mongodbUri',
    'jwt.secret',
    'cloudinary.apiKey',
    'cloudinary.apiSecret',
    'email.smtp.user',
    'email.smtp.pass',
    'email.queue.redisUrl',
  ];

  const missing = requiredKeys.filter((key) => {
    const keys = key.split('.');
    let value = config;
    for (const k of keys) {
      value = value[k];
      if (!value) return true;
    }
    return false;
  });

  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing });
    process.exit(1);
  }
}

export default config;
