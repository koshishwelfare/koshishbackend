import { Queue } from 'bullmq';
import config from '../../config.js';
import logger from './logger.js';

const safe = (value) => String(value || '').trim();

let emailQueue = null;

const getQueueConfig = () => config.email?.queue || {};

const parseRedisUrl = (redisUrl) => {
  const parsedUrl = new URL(redisUrl);

  return {
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || 6379),
    username: parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined,
    password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
    db: parsedUrl.pathname && parsedUrl.pathname !== '/'
      ? Number(parsedUrl.pathname.slice(1))
      : undefined,
    tls: parsedUrl.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
};

const getRedisConnection = () => {
  const queueConfig = getQueueConfig();
  const redisUrl = safe(queueConfig.redisUrl);

  if (redisUrl) {
    return parseRedisUrl(redisUrl);
  }

  return {
    host: safe(queueConfig.redisHost) || '127.0.0.1',
    port: Number(queueConfig.redisPort || 6379),
    username: safe(queueConfig.redisUsername) || undefined,
    password: safe(queueConfig.redisPassword) || undefined,
    tls: queueConfig.redisTls ? {} : undefined,
    maxRetriesPerRequest: null,
  };
};

const isEmailQueueConfigured = () => {
  const queueConfig = getQueueConfig();
  return Boolean(
    safe(queueConfig.redisUrl) ||
      safe(queueConfig.redisHost) ||
      safe(queueConfig.redisPassword)
  );
};

const getEmailQueueName = () => safe(getQueueConfig().queueName) || 'email-notifications';

const getEmailQueue = () => {
  if (emailQueue) {
    return emailQueue;
  }

  emailQueue = new Queue(getEmailQueueName(), {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: Number(getQueueConfig().attempts || 3),
      backoff: {
        type: 'exponential',
        delay: Number(getQueueConfig().backoffDelayMs || 5000),
      },
      removeOnComplete: Number(getQueueConfig().removeOnComplete || 1000),
      removeOnFail: Number(getQueueConfig().removeOnFail || 5000),
    },
  });

  emailQueue.on('error', (error) => {
    logger.error('BullMQ email queue error', {
      error: error.message,
      queueName: getEmailQueueName(),
    });
  });

  return emailQueue;
};

const enqueueEmailJob = async ({ type = 'email', payload, meta = {} }) => {
  if (!isEmailQueueConfigured()) {
    return {
      queued: false,
      error: 'Redis is not configured for email queue',
    };
  }

  const queue = getEmailQueue();
  const job = await queue.add(type, {
    type,
    payload,
    meta,
    queuedAt: new Date().toISOString(),
  });

  return {
    queued: true,
    queueProvider: 'bullmq',
    queueName: getEmailQueueName(),
    jobId: job.id,
  };
};

const getEmailQueueHealth = async () => {
  const configured = isEmailQueueConfigured();

  if (!configured) {
    return {
      provider: 'bullmq',
      enabled: true,
      configured: false,
      connected: false,
      queueName: getEmailQueueName(),
      error: 'Redis is not configured for email queue',
    };
  }

  try {
    const queue = getEmailQueue();
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');

    return {
      provider: 'bullmq',
      enabled: true,
      configured: true,
      connected: true,
      queueName: getEmailQueueName(),
      counts,
      redis: {
        host: getRedisConnection().host,
        port: getRedisConnection().port,
        tls: Boolean(getRedisConnection().tls),
      },
      error: null,
    };
  } catch (error) {
    logger.error('BullMQ email queue health check failed', {
      error: error.message,
      queueName: getEmailQueueName(),
    });

    return {
      provider: 'bullmq',
      enabled: true,
      configured: true,
      connected: false,
      queueName: getEmailQueueName(),
      error: error.message,
    };
  }
};

const closeEmailQueue = async () => {
  if (!emailQueue) {
    return;
  }

  await emailQueue.close();
  emailQueue = null;
};

export {
  closeEmailQueue,
  enqueueEmailJob,
  getEmailQueueHealth,
  getEmailQueueName,
  getRedisConnection,
  isEmailQueueConfigured,
};
