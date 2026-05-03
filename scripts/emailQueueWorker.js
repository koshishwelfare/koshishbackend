import config from '../config.js';
import logger from '../notification/services/logger.js';
import { deleteEmailJob, receiveEmailJobs, isQueueEnabled, isQueueConfigured } from '../notification/index.js';
import { sendMailDirect } from '../notification/index.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let keepRunning = true;

const parseJobBody = (body) => {
  try {
    return JSON.parse(body);
  } catch (error) {
    return null;
  }
};

const processJob = async (message) => {
  const body = parseJobBody(message.body);

  if (!body || !body.payload) {
    logger.error('Email queue message body is invalid', {
      messageId: message.messageId,
      body: message.body,
    });

    await deleteEmailJob(message.receiptHandle);
    return;
  }

  const payload = body.payload;
  const result = await sendMailDirect(payload);

  if (result.sent) {
    await deleteEmailJob(message.receiptHandle);
    logger.info('Queued email processed successfully', {
      messageId: message.messageId,
      queuedMessageId: body?.messageId || null,
      to: payload.to,
      subject: payload.subject,
      attempts: result.attempts,
    });
    return;
  }

  logger.error('Queued email failed to send', {
    messageId: message.messageId,
    to: payload.to,
    subject: payload.subject,
    error: result.error,
    attempts: result.attempts,
  });
};

const runWorker = async () => {
  if (!isQueueEnabled()) {
    logger.error('Email queue worker cannot start because the queue is disabled');
    process.exitCode = 1;
    return;
  }

  if (!isQueueConfigured()) {
    logger.error('Email queue worker cannot start because the queue is not fully configured');
    process.exitCode = 1;
    return;
  }

  logger.info('Email queue worker started', {
    region: config.email?.queue?.region,
    queueName: config.email?.queue?.queueName,
    queueUrl: config.email?.queue?.queueUrl || 'resolved at runtime',
  });

  while (keepRunning) {
    try {
      const batch = await receiveEmailJobs();
      const messages = batch.messages || [];

      if (messages.length === 0) {
        await sleep(config.email?.queue?.pollDelayMs || 5000);
        continue;
      }

      for (const message of messages) {
        if (!keepRunning) {
          break;
        }

        await processJob(message);
      }
    } catch (error) {
      logger.error('Email queue worker polling failed', {
        error: error.message,
        code: error.code,
      });
      await sleep(config.email?.queue?.pollDelayMs || 5000);
    }
  }

  logger.info('Email queue worker stopped');
};

process.on('SIGINT', () => {
  keepRunning = false;
});

process.on('SIGTERM', () => {
  keepRunning = false;
});

runWorker().catch((error) => {
  logger.error('Email queue worker crashed', {
    error: error.message,
    stack: error.stack,
  });
  process.exitCode = 1;
});
