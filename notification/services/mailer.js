import nodemailer from 'nodemailer';
import config from '../../config.js';
import logger from './logger.js';
import { validateEmailParams, sanitizeEmail } from './emailValidator.js';
import { enqueueEmailJob, getEmailQueueHealth, isEmailQueueConfigured } from './emailQueue.js';
import { authEventTemplate, credentialsTemplate, holidayEventTemplate } from '../templates/emailTemplates.js';

const safe = (value) => String(value || '').trim();

// Transporter pool (reuse connection instead of creating new one each time)
let transporterPool = null;

/**
 * Check if SMTP configuration is complete
 */
const hasMailerConfig = () => {
  const host = safe(config.email?.smtp?.host);
  const user = safe(config.email?.smtp?.user);
  const pass = safe(config.email?.smtp?.pass);
  const port = Number(config.email?.smtp?.port || 0);
  
  const configured = Boolean(host && user && pass && port);
  
  if (!configured) {
    logger.warn('SMTP configuration incomplete', {
      hasHost: !!host,
      hasUser: !!user,
      hasPass: !!pass,
      hasPort: !!port,
    });
  }
  
  return configured;
};

/**
 * Create or reuse transporter (connection pooling)
 */
const getTransporter = () => {
  if (transporterPool) {
    return transporterPool;
  }

  const host = safe(config.email.smtp.host);
  const port = Number(config.email.smtp.port || 587);
  const user = safe(config.email.smtp.user);
  const pass = safe(config.email.smtp.pass);

  transporterPool = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: {
      user,
      pass
    },
    pool: {
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 4000,
      rateLimit: 14
    },
    logger: process.env.NODE_ENV === 'development',
    debug: process.env.NODE_ENV === 'development',
  });

  logger.info('Email transporter pool initialized', {
    host,
    port,
    user: user.substring(0, 5) + '***'
  });

  return transporterPool;
};

/**
 * Send email with retry logic and comprehensive logging
 * @param {object} params - { to, subject, text, html, retries, delayMs }
 * @returns {Promise<object>} - { sent: boolean, messageId?: string, error?: string, attempts?: number }
 */
const sendMailWithRetry = async (
  { to, subject, text, html },
  maxRetries = 3,
  delayMs = 1000
) => {
  // Validate input parameters
  const validation = validateEmailParams({ to, subject, text, html });
  if (!validation.valid) {
    const errorMsg = validation.errors.join('; ');
    logger.error('Email validation failed', { to, subject, errors: validation.errors });
    return { sent: false, error: errorMsg, attempts: 0 };
  }

  // Check SMTP configuration
  if (!hasMailerConfig()) {
    logger.error('SMTP not configured', { to, subject });
    return { sent: false, error: 'SMTP not configured', attempts: 0 };
  }

  const fromEmail = safe(config.email.smtp.from) || safe(config.email.smtp.user);
  if (!fromEmail) {
    logger.error('SMTP from email missing', {});
    return { sent: false, error: 'SMTP from email is missing', attempts: 0 };
  }

  const sanitizedTo = Array.isArray(to) ? to.map(sanitizeEmail).join(',') : sanitizeEmail(to);

  let lastError = null;
  let attempt = 0;

  for (attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug(`Email send attempt ${attempt}/${maxRetries}`, { to: sanitizedTo, subject });

      const transporter = getTransporter();
      const info = await transporter.sendMail({
        from: fromEmail,
        to: sanitizedTo,
        subject,
        text,
        html,
      });

      logger.info('Email sent successfully', {
        to: sanitizedTo,
        subject,
        messageId: info.messageId,
        attempt,
        response: info.response,
      });

      return {
        sent: true,
        messageId: info.messageId,
        response: info.response,
        attempts: attempt,
      };
    } catch (error) {
      lastError = error;
      logger.warn(`Email send failed (attempt ${attempt}/${maxRetries})`, {
        to: sanitizedTo,
        subject,
        error: error.message,
        code: error.code,
        attempt,
      });

      // Don't retry on last attempt
      if (attempt < maxRetries) {
        const waitTime = delayMs * Math.pow(2, attempt - 1); // Exponential backoff
        logger.debug(`Waiting ${waitTime}ms before retry...`, { attempt });
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // All retries exhausted
  logger.error('Email send failed after all retry attempts', {
    to: sanitizedTo,
    subject,
    error: lastError?.message,
    attempts: attempt,
    code: lastError?.code,
  });

  return {
    sent: false,
    error: lastError?.message || 'Unknown error',
    attempts: attempt,
  };
};

const queueMail = async ({ to, subject, text, html }, queueMeta = {}) => {
  const payload = { to, subject, text, html };

  const validation = validateEmailParams(payload);
  if (!validation.valid) {
    const errorMsg = validation.errors.join('; ');
    logger.error('Email validation failed before queueing', { to, subject, errors: validation.errors });
    return { sent: false, queued: false, error: errorMsg, attempts: 0 };
  }

  if (!isEmailQueueConfigured()) {
    logger.error('Redis email queue is not configured', { to, subject, type: queueMeta.type || 'email' });
    return { sent: false, queued: false, error: 'Redis is not configured for email queue', attempts: 0 };
  }

  try {
    const queueResult = await enqueueEmailJob({
      type: queueMeta.type || 'email',
      payload,
      meta: queueMeta,
    });

    if (!queueResult.queued) {
      return { sent: false, queued: false, error: queueResult.error, attempts: 0 };
    }

    logger.info('Email queued for BullMQ delivery', {
      to,
      subject,
      jobId: queueResult.jobId,
      queueName: queueResult.queueName,
      type: queueMeta.type || 'email',
    });

    return {
      sent: true,
      queued: true,
      queueProvider: 'bullmq',
      queueName: queueResult.queueName,
      jobId: queueResult.jobId,
      attempts: 0,
    };
  } catch (error) {
    logger.error('Email queue enqueue failed', {
      to,
      subject,
      error: error.message,
      type: queueMeta.type || 'email',
    });

    return { sent: false, queued: false, error: error.message, attempts: 0 };
  }
};

/**
 * Send raw email
 */
const sendCredentialsEmail = async ({ to, subject, text }) => {
  return await queueMail({ to, subject, text }, { type: 'raw' });
};

/**
 * Send credentials email with HTML template
 */
const sendCredentialTemplateEmail = async ({ to, name, username, password, label }) => {
  try {
    const payload = credentialsTemplate({ name, username, password, label });
    return await queueMail({ to, ...payload }, {
      type: 'credential-template',
      name,
      username,
      label,
    });
  } catch (error) {
    logger.error('Error generating credential template', {
      to,
      name,
      error: error.message,
    });
    return { sent: false, error: 'Failed to generate email template' };
  }
};

/**
 * Send authentication event notification
 */
const sendAuthNotificationEmail = async ({ to, role, eventType, actor, timestamp, ipAddress }) => {
  if (!to) {
    logger.error('Auth notification email missing recipient', { role, eventType });
    return { sent: false, error: 'notification recipient missing' };
  }

  try {
    const payload = authEventTemplate({ role, eventType, actor, timestamp, ipAddress });
    return await queueMail({ to, ...payload }, {
      type: 'auth-notification',
      role,
      eventType,
      actor,
    });
  } catch (error) {
    logger.error('Error generating auth notification template', {
      to,
      role,
      eventType,
      error: error.message,
    });
    return { sent: false, error: 'Failed to generate email template' };
  }
};

/**
 * Send holiday notification email
 */
const sendHolidayNotificationEmail = async ({ to, recipientName, sessionName, holidayTitle, holidayDate, description, action }) => {
  if (!to) {
    logger.error('Holiday notification email missing recipient', { holidayTitle, sessionName });
    return { sent: false, error: 'notification recipient missing' };
  }

  try {
    const payload = holidayEventTemplate({
      recipientName,
      sessionName,
      holidayTitle,
      holidayDate,
      description,
      action,
    });
    return await queueMail({ to, ...payload }, {
      type: 'holiday-notification',
      recipientName,
      sessionName,
      holidayTitle,
      holidayDate,
      action,
    });
  } catch (error) {
    logger.error('Error generating holiday notification template', {
      to,
      holidayTitle,
      sessionName,
      error: error.message,
    });
    return { sent: false, error: 'Failed to generate email template' };
  }
};

/**
 * Health check for email system
 */
const checkEmailHealth = async () => {
  const config_valid = hasMailerConfig();
  
  let connection_ok = false;
  let error = null;

  if (config_valid) {
    try {
      const transporter = getTransporter();
      await transporter.verify();
      connection_ok = true;
      logger.info('Email system health check passed');
    } catch (err) {
      error = err.message;
      logger.error('Email system health check failed', { error: err.message, code: err.code });
    }
  }

  const queueHealth = await getEmailQueueHealth();

  return {
    configured: config_valid,
    connected: connection_ok,
    error: error || null,
    queue: queueHealth,
  };
};

export { sendCredentialsEmail, sendCredentialTemplateEmail, sendAuthNotificationEmail, sendHolidayNotificationEmail, checkEmailHealth, sendMailWithRetry, queueMail };
