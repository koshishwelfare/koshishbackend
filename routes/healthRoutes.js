import express from 'express';
import { checkEmailHealth } from '../notification/index.js';

const router = express.Router();

/**
 * Health check endpoint for email system
 * GET /health/email
 * Returns: { configured: boolean, connected: boolean, error?: string, queue?: object }
 */
router.get('/email', async (req, res) => {
  try {
    const health = await checkEmailHealth();
    const statusCode = health.connected ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      configured: false,
      connected: false,
      error: error.message,
    });
  }
});

export default router;
