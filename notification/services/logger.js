import fs from 'fs';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory path
const logsDir = path.join(__dirname, '../../logs');
fs.mkdirSync(logsDir, { recursive: true });

// Define log levels with colors
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message}` +
      (Object.keys(info).length > 4 ? ` ${JSON.stringify(Object.assign({}, info, { timestamp: undefined, level: undefined, message: undefined }), null, 2)}` : '')
  )
);

// Define transports
const transports = [
  // Console logs
  new winston.transports.Console(),
  
  // Error logs
  new winston.transports.File({
    filename: path.join(logsDir, 'errors.log'),
    level: 'error',
    format: winston.format.uncolorize(),
  }),
  
  // All logs (combined)
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    format: winston.format.uncolorize(),
  }),

  // Email-specific logs
  new winston.transports.File({
    filename: path.join(logsDir, 'email.log'),
    level: 'info',
    format: winston.format.uncolorize(),
  }),
];

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  levels,
  format,
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') }),
  ],
});

export default logger;
