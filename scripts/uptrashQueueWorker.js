/**
 * Uptrash Queue Worker
 * Consumes email jobs from Uptrash queue and sends them via SMTP
 * Run this as a separate process: npm run uptrash:worker
 */

import {
  receiveFromUptrash,
  acknowledgeUptrashMessage,
  isUptrashEnabled,
  getUptrashHealth,
} from '../notification/index.js';
import { sendMailDirect, notificationLogger } from '../notification/index.js';

const logger = notificationLogger;
let keepRunning = true;

/**
 * Parse job body and extract email payload
 */
const parseJobBody = (bodyString) => {
  try {
    if (typeof bodyString === 'string') {
      const parsed = JSON.parse(bodyString);
      // If the body is itself a JSON string, parse again
      if (typeof parsed.body === 'string') {
        return {
          ...parsed,
          body: JSON.parse(parsed.body),
        };
      }
      return parsed;
    }
    return bodyString;
  } catch (error) {
    logger.error('Failed to parse Uptrash job body', {
      error: error.message,
      bodyLength: bodyString?.length,
    });
    return null;
  }
};

/**
 * Process a single email job from Uptrash
 */
const processJob = async (message) => {
  if (!message || !message.id) {
    logger.error('Invalid Uptrash message format', { message });
    return false;
  }

  try {
    const body = parseJobBody(message.body);

    if (!body || !body.payload) {
      logger.error('Uptrash message body is invalid - missing payload', {
        messageId: message.id,
        hasBody: !!body,
      });
      // Acknowledge invalid message to remove it from queue
      try {
        await acknowledgeUptrashMessage(message.id);
      } catch (ackError) {
        logger.warn('Failed to acknowledge invalid Uptrash message', {
          messageId: message.id,
          error: ackError.message,
        });
      }
      return false;
    }

    const payload = body.payload;

    // Validate email payload
    if (!payload.to || !payload.subject) {
      logger.error('Uptrash message missing required fields', {
        messageId: message.id,
        hasTo: !!payload.to,
        hasSubject: !!payload.subject,
      });
      // Acknowledge and skip
      try {
        await acknowledgeUptrashMessage(message.id);
      } catch (ackError) {
        logger.warn('Failed to acknowledge malformed Uptrash message', {
          messageId: message.id,
          error: ackError.message,
        });
      }
      return false;
    }

    // Send email via SMTP
    const result = await sendMailDirect(payload);

    if (result.sent) {
      // Acknowledge successful message
      try {
        await acknowledgeUptrashMessage(message.id);
      } catch (ackError) {
        logger.warn('Failed to acknowledge Uptrash message after successful send', {
          messageId: message.id,
          to: payload.to,
          error: ackError.message,
        });
      }

      logger.info('Uptrash email processed successfully', {
        messageId: message.id,
        to: payload.to,
        subject: payload.subject,
        attempts: result.attempts,
        uptrashMessageId: body.id,
      });
      return true;
    } else {
      // Email send failed - leave message in queue for Uptrash timeout/retry
      logger.error('Uptrash email failed to send', {
        messageId: message.id,
        to: payload.to,
        subject: payload.subject,
        error: result.error,
        attempts: result.attempts,
      });
      return false;
    }
  } catch (error) {
    logger.error('Error processing Uptrash message', {
      messageId: message.id,
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
};

/**
 * Main worker loop - continuously poll Uptrash for messages
 */
const runWorker = async () => {
  logger.info('Uptrash email queue worker started');

  const pollIntervalMs = parseInt(process.env.UPTRASH_POLL_INTERVAL_MS || '5000', 10);
  const maxMessagesPerBatch = parseInt(process.env.UPTRASH_MAX_MESSAGES_PER_BATCH || '10', 10);

  while (keepRunning) {
    try {
      // Check queue health before polling
      const health = await getUptrashHealth();
      if (!health.accessible) {
        logger.warn('Uptrash queue not accessible, retrying in next cycle', {
          error: health.error,
        });
        await sleep(pollIntervalMs);
        continue;
      }

      // Receive batch of messages
      const messages = await receiveFromUptrash(maxMessagesPerBatch);

      if (!messages || messages.length === 0) {
        // No messages - wait before retrying
        logger.debug('No messages in Uptrash queue');
        await sleep(pollIntervalMs);
        continue;
      }

      logger.info('Received batch from Uptrash', { messageCount: messages.length });

      // Process each message
      for (const message of messages) {
        if (!keepRunning) {
          logger.info('Worker shutdown signal received, stopping processing');
          break;
        }

        await processJob(message);
      }
    } catch (error) {
      logger.error('Uptrash queue worker polling error', {
        error: error.message,
        code: error.code,
      });
      await sleep(pollIntervalMs);
    }
  }

  logger.info('Uptrash email queue worker stopped');
};

/**
 * Sleep helper
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Graceful shutdown handlers
 */
process.on('SIGINT', () => {
  logger.info('SIGINT received - gracefully shutting down Uptrash worker');
  keepRunning = false;
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received - gracefully shutting down Uptrash worker');
  keepRunning = false;
});

process.on('SIGHUP', () => {
  logger.info('SIGHUP received - gracefully shutting down Uptrash worker');
  keepRunning = false;
});

// Startup check
if (!isUptrashEnabled()) {
  logger.error('Uptrash is not enabled or not configured');
  logger.error('Please set EMAIL_QUEUE_UPTRASH_ENABLED=true and UPTRASH_API_KEY environment variables');
  process.exit(1);
}

// Start worker
runWorker().catch((error) => {
  logger.error('Uptrash queue worker crashed', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
