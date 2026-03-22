import nodemailer from 'nodemailer';
import config from '../config.js';
import { authEventTemplate, credentialsTemplate, holidayEventTemplate } from './emailTemplates.js';

const safe = (value) => String(value || '').trim();

const hasMailerConfig = () => {
  const host = safe(config.email?.smtp?.host);
  const user = safe(config.email?.smtp?.user);
  const pass = safe(config.email?.smtp?.pass);
  const port = Number(config.email?.smtp?.port || 0);
  return Boolean(host && user && pass && port);
};

const createTransporter = () => {
  const host = safe(config.email.smtp.host);
  const port = Number(config.email.smtp.port || 587);
  const user = safe(config.email.smtp.user);
  const pass = safe(config.email.smtp.pass);

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: {
      user,
      pass
    }
  });
};

const sendMail = async ({ to, subject, text, html }) => {
  if (!hasMailerConfig()) {
    return { sent: false, reason: 'SMTP not configured' };
  }

  try {
    const transporter = createTransporter();
    const fromEmail = safe(config.email.smtp.from) || safe(config.email.smtp.user);

    if (!fromEmail) {
      return { sent: false, reason: 'SMTP from email is missing' };
    }

    await transporter.sendMail({
      from: fromEmail,
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

const sendHolidayNotificationEmail = async ({ to, recipientName, sessionName, holidayTitle, holidayDate, description, action }) => {
  if (!to) {
    return { sent: false, reason: 'notification recipient missing' };
  }

  const payload = holidayEventTemplate({
    recipientName,
    sessionName,
    holidayTitle,
    holidayDate,
    description,
    action
  });

  return await sendMail({ to, ...payload });
};

export { sendCredentialsEmail, sendCredentialTemplateEmail, sendAuthNotificationEmail, sendHolidayNotificationEmail };
