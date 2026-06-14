// Main export file for email notification services
export {
  sendCredentialsEmail,
  sendCredentialTemplateEmail,
  sendAuthNotificationEmail,
  sendHolidayNotificationEmail,
  checkEmailHealth,
} from './services/mailer.js';

export {
  enqueueEmailJob,
  closeEmailQueue,
  getEmailQueueHealth,
  getEmailQueueName,
  getRedisConnection,
  isEmailQueueConfigured,
} from './services/emailQueue.js';

export { validateEmailParams, validateRecipients, isValidEmail } from './services/emailValidator.js';
export { default as notificationLogger } from './services/logger.js';
