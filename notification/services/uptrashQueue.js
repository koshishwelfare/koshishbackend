/**
 * Uptrash Queue Service
 * REST API client for Uptrash email queue integration
 * Uses Bearer token authentication and JSON-based message format
 */

import https from 'https';
import config from '../../config.js';
import logger from './logger.js';

/**
 * Make HTTPS request to Uptrash API
 */
const makeRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const baseUrl = new URL(config.email.queue.uptrash.baseUrl);
    const url = new URL(path, baseUrl);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.email.queue.uptrash.apiKey}`,
      },
    };

    if (body) {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const statusCode = res.statusCode || 500;
          const parsed = data ? JSON.parse(data) : {};

          if (statusCode >= 200 && statusCode < 300) {
            resolve({ statusCode, data: parsed, raw: data });
          } else {
            reject({
              statusCode,
              message: parsed.message || parsed.error || `HTTP ${statusCode}`,
              code: parsed.code,
              details: parsed,
            });
          }
        } catch (e) {
          reject({
            statusCode: res.statusCode || 500,
            message: `Failed to parse Uptrash response: ${e.message}`,
            raw: data,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject({
        statusCode: 0,
        message: `Uptrash request failed: ${error.message}`,
        code: error.code,
      });
    });

    if (body) {
      const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
      req.write(bodyString);
    }

    req.end();
  });
};

/**
 * Check if Uptrash is enabled and configured
 */
export const isUptrashEnabled = () => {
  return (
    config.email.queue.uptrash.enabled &&
    config.email.queue.uptrash.apiKey &&
    config.email.queue.uptrash.baseUrl &&
    config.email.queue.uptrash.queueName
  );
};

/**
 * Enqueue an email job to Uptrash
 * @param {Object} job - Email job object { type, payload, meta, queuedAt }
 * @returns {Promise<Object>} - { messageId, queueName, enqueuedAt }
 */
export const enqueueToUptrash = async (job) => {
  if (!isUptrashEnabled()) {
    throw new Error('Uptrash is not enabled or not configured');
  }

  const { queueName, baseUrl } = config.email.queue.uptrash;
  const messageBody = JSON.stringify({
    ...job,
    queuedAt: job.queuedAt || new Date().toISOString(),
  });

  try {
    const path = `/queues/${encodeURIComponent(queueName)}/messages`;
    const response = await makeRequest('POST', path, { body: messageBody });

    logger.info('Email queued to Uptrash', {
      to: job.payload?.to,
      subject: job.payload?.subject,
      messageId: response.data.id,
      queueName,
    });

    return {
      messageId: response.data.id,
      queueName,
      enqueuedAt: new Date().toISOString(),
      baseUrl,
    };
  } catch (error) {
    logger.error('Failed to enqueue email to Uptrash', {
      to: job.payload?.to,
      subject: job.payload?.subject,
      error: error.message,
      statusCode: error.statusCode,
      code: error.code,
    });
    throw error;
  }
};

/**
 * Receive messages from Uptrash queue
 * @param {number} maxMessages - Maximum messages to receive (default 10)
 * @returns {Promise<Array>} - Array of messages { id, body, attributes, receivedCount }
 */
export const receiveFromUptrash = async (maxMessages = 10) => {
  if (!isUptrashEnabled()) {
    throw new Error('Uptrash is not enabled or not configured');
  }

  const { queueName } = config.email.queue.uptrash;

  try {
    const params = new URLSearchParams({
      maxMessages: String(Math.min(maxMessages, 100)),
      wait: String(config.email.queue.uptrash.pollIntervalMs / 1000 || 5),
    });

    const path = `/queues/${encodeURIComponent(queueName)}/messages?${params.toString()}`;
    const response = await makeRequest('GET', path);

    const messages = Array.isArray(response.data.messages) ? response.data.messages : [];

    if (messages.length > 0) {
      logger.debug('Received messages from Uptrash', {
        queueName,
        messageCount: messages.length,
        messageIds: messages.map((m) => m.id),
      });
    }

    return messages.map((msg) => ({
      id: msg.id,
      body: typeof msg.body === 'string' ? msg.body : JSON.stringify(msg.body),
      attributes: msg.attributes || {},
      receivedCount: msg.receivedCount || 1,
    }));
  } catch (error) {
    logger.error('Failed to receive messages from Uptrash', {
      queueName,
      error: error.message,
      statusCode: error.statusCode,
    });
    throw error;
  }
};

/**
 * Acknowledge (delete) a message from Uptrash queue
 * @param {string} messageId - Message ID to acknowledge
 * @returns {Promise<void>}
 */
export const acknowledgeUptrashMessage = async (messageId) => {
  if (!isUptrashEnabled()) {
    throw new Error('Uptrash is not enabled or not configured');
  }

  const { queueName } = config.email.queue.uptrash;

  try {
    const path = `/queues/${encodeURIComponent(queueName)}/messages/${encodeURIComponent(messageId)}`;
    await makeRequest('DELETE', path);

    logger.debug('Acknowledged message in Uptrash', {
      messageId,
      queueName,
    });
  } catch (error) {
    logger.error('Failed to acknowledge message in Uptrash', {
      messageId,
      queueName,
      error: error.message,
      statusCode: error.statusCode,
    });
    throw error;
  }
};

/**
 * Get Uptrash queue health/status
 * @returns {Promise<Object>} - { accessible, messageCount, deadLetterCount, retrying }
 */
export const getUptrashHealth = async () => {
  if (!isUptrashEnabled()) {
    return {
      enabled: false,
      accessible: false,
      messageCount: 0,
      error: 'Uptrash not enabled',
    };
  }

  const { queueName } = config.email.queue.uptrash;

  try {
    const path = `/queues/${encodeURIComponent(queueName)}`;
    const response = await makeRequest('GET', path);

    logger.debug('Uptrash queue health check passed', {
      queueName,
      messageCount: response.data.messageCount || 0,
    });

    return {
      enabled: true,
      accessible: true,
      messageCount: response.data.messageCount || 0,
      deadLetterCount: response.data.deadLetterCount || 0,
      retrying: response.data.retryCount || 0,
    };
  } catch (error) {
    logger.warn('Uptrash queue health check failed', {
      queueName,
      error: error.message,
      statusCode: error.statusCode,
    });

    return {
      enabled: true,
      accessible: false,
      messageCount: 0,
      error: error.message,
    };
  }
};

export default {
  isUptrashEnabled,
  enqueueToUptrash,
  receiveFromUptrash,
  acknowledgeUptrashMessage,
  getUptrashHealth,
};
