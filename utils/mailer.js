import nodemailer from 'nodemailer';
import config from '../config.js';
import { authEventTemplate, credentialsTemplate } from './emailTemplates.js';

const hasMailerConfig = () => {
  return config.email.isConfigured;
};

const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.email.smtp.host,
    port: config.email.smtp.port,
    secure: config.email.smtp.port === 465,
    auth: {
      user: config.email.smtp.user,
      pass: config.email.smtp.pass
    }
  });
};

const sendMail = async ({ to, subject, text, html }) => {
  if (!hasMailerConfig()) {
    return { sent: false, reason: 'SMTP not configured' };
  }

  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: config.email.smtp.from,
      to,
      subject,
      text,
      html
    });

    return { sent: true };
  } catch (error) {
    return { sent: false, reason: error.message };
  }
};

const sendCredentialsEmail = async ({ to, subject, text }) => {
  return await sendMail({ to, subject, text });
};

const sendCredentialTemplateEmail = async ({ to, name, username, password, label }) => {
  const payload = credentialsTemplate({ name, username, password, label });
  return await sendMail({ to, ...payload });
};

const sendAuthNotificationEmail = async ({ to, role, eventType, actor, timestamp, ipAddress }) => {
  if (!to) {
    return { sent: false, reason: 'notification recipient missing' };
  }

  const payload = authEventTemplate({ role, eventType, actor, timestamp, ipAddress });
  return await sendMail({ to, ...payload });
};

export { sendCredentialsEmail, sendCredentialTemplateEmail, sendAuthNotificationEmail };
