import { Worker } from 'bullmq';
import logger from '../notification/services/logger.js';
import {
  getEmailQueueName,
  getRedisConnection,
  isEmailQueueConfigured,
} from '../notification/index.js';
import { sendMailWithRetry } from '../notification/services/mailer.js';

if (!isEmailQueueConfigured()) {
  logger.error('Email queue worker cannot start because Redis is not configured');
  process.exit(1);
}

const worker = new Worker(
  getEmailQueueName(),
  async (job) => {
    const payload = job.data?.payload;

    if (!payload || !payload.to || !payload.subject) {
      throw new Error('Email job payload is invalid');
    }

    const result = await sendMailWithRetry(payload);

    if (!result.sent) {
      throw new Error(result.error || 'Queued email failed to send');
    }

    logger.info('BullMQ email processed successfully', {
      jobId: job.id,
      name: job.name,
      to: payload.to,
      subject: payload.subject,
      attempts: result.attempts,
    });

    return {
      messageId: result.messageId,
      response: result.response,
      attempts: result.attempts,
    };
  },
  {
    connection: getRedisConnection(),
    concurrency: Number(process.env.EMAIL_QUEUE_CONCURRENCY || 5),
  }
);

logger.info('BullMQ email worker started', {
  queueName: getEmailQueueName(),
  concurrency: Number(process.env.EMAIL_QUEUE_CONCURRENCY || 5),
});

worker.on('failed', (job, error) => {
  logger.error('BullMQ email job failed', {
    jobId: job?.id,
    name: job?.name,
    attemptsMade: job?.attemptsMade,
    error: error.message,
  });
});

worker.on('error', (error) => {
  logger.error('BullMQ email worker error', {
    error: error.message,
  });
});

process.on('SIGINT', () => {
  void worker.close().then(() => process.exit(0));
});

process.on('SIGTERM', () => {
  void worker.close().then(() => process.exit(0));
});
