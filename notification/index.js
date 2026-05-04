// Main export file for email notification services
export {
  sendCredentialsEmail,
  sendCredentialTemplateEmail,
  sendAuthNotificationEmail,
  sendHolidayNotificationEmail,
  checkEmailHealth,
  sendMailWithRetry as sendMailDirect,
} from './services/mailer.js';

// SQS Queue exports
export {
  enqueueEmailJob,
  receiveEmailJobs,
  deleteEmailJob,
  resolveQueueUrl,
  getEmailQueueHealth,
  isQueueEnabled,
  isQueueConfigured,
  isSqsEnabled,
} from './services/sqsQueue.js';

// Uptrash Queue exports
export {
  enqueueToUptrash,
  receiveFromUptrash,
  acknowledgeUptrashMessage,
  getUptrashHealth,
  isUptrashEnabled,
} from './services/uptrashQueue.js';

export { validateEmailParams, validateRecipients, isValidEmail } from './services/emailValidator.js';
export { default as notificationLogger } from './services/logger.js';
