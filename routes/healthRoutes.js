import express from 'express';
import asyncHandler from 'express-async-handler';
import { checkEmailHealth } from '../notification/index.js';

const router = express.Router();

/**
 * Health check endpoint for email system
 * GET /health/email
 * Returns: { 
 *   configured: boolean, 
 *   connected: boolean, 
 *   error?: string, 
 *   queue?: {
 *     provider: 'bullmq',
 *     connected: boolean,
 *     queueName: string,
 *     counts?: object,
 *     error?: string
 *   }
 * }
 * Status: 200 if connected, 503 if not
 */
router.get('/email', asyncHandler(async (req, res) => {
  const health = await checkEmailHealth();
  const statusCode = health.connected ? 200 : 503;
  res.status(statusCode).json(health);
}));

export default router;
