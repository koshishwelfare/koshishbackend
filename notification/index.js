// Main export file for email notification services
export {
  sendCredentialsEmail,
  sendCredentialTemplateEmail,
  sendAuthNotificationEmail,
  sendHolidayNotificationEmail,
  checkEmailHealth,
  sendMailWithRetry as sendMailDirect,
} from './services/mailer.js';

export {
  enqueueEmailJob,
  receiveEmailJobs,
  deleteEmailJob,
  resolveQueueUrl,
  getEmailQueueHealth,
  isQueueEnabled,
  isQueueConfigured,
} from './services/sqsQueue.js';

export { validateEmailParams, validateRecipients, isValidEmail } from './services/emailValidator.js';
export { default as notificationLogger } from './services/logger.js';
