import crypto from 'crypto';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import config from '../../config.js';
import logger from './logger.js';

const AWS_SERVICE = 'sqs';
const AWS_VERSION = '2012-11-05';

let resolvedQueueUrlCache = null;

const safe = (value) => String(value || '').trim();

const getQueueConfig = () => config.email?.queue || {};

const isQueueEnabled = () => Boolean(getQueueConfig().enabled);

const isQueueConfigured = () => {
  const queueConfig = getQueueConfig();
  const region = safe(queueConfig.region);
  const queueUrl = safe(queueConfig.queueUrl);
  const queueName = safe(queueConfig.queueName);
  const accessKeyId = safe(queueConfig.accessKeyId);
  const secretAccessKey = safe(queueConfig.secretAccessKey);

  return Boolean(isQueueEnabled() && region && (queueUrl || queueName) && accessKeyId && secretAccessKey);
};

const getBaseEndpoint = () => {
  const queueConfig = getQueueConfig();
  const endpoint = safe(queueConfig.endpoint);
  if (endpoint) {
    return new URL(endpoint);
  }

  const region = safe(queueConfig.region) || 'us-east-1';
  return new URL(`https://sqs.${region}.amazonaws.com`);
};

const getQueueRegion = () => safe(getQueueConfig().region) || 'us-east-1';

const getCredentials = () => ({
  accessKeyId: safe(getQueueConfig().accessKeyId),
  secretAccessKey: safe(getQueueConfig().secretAccessKey),
  sessionToken: safe(getQueueConfig().sessionToken),
});

const sha256Hex = (value) => crypto.createHash('sha256').update(value).digest('hex');

const hmac = (key, value, encoding = 'hex') => {
  const digest = crypto.createHmac('sha256', key).update(value, 'utf8');
  return encoding ? digest.digest(encoding) : digest.digest();
};

const getAmzDates = (date = new Date()) => {
  const dateStamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { dateStamp, amzDate };
};

const getSigningKey = (secretAccessKey, dateStamp, region, service = AWS_SERVICE) => {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp, null);
  const kRegion = hmac(kDate, region, null);
  const kService = hmac(kRegion, service, null);
  return hmac(kService, 'aws4_request', null);
};

const normalizeHeaders = (headers) => {
  const normalized = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = String(value).trim().replace(/\s+/g, ' ');
  }
  return normalized;
};

const buildCanonicalHeaders = (headers) => {
  const headerNames = Object.keys(headers).sort();
  const canonicalHeaders = headerNames.map((name) => `${name}:${headers[name]}\n`).join('');
  const signedHeaders = headerNames.join(';');
  return { canonicalHeaders, signedHeaders };
};

const buildSignature = ({ method, url, body, credentials, region, date = new Date(), extraHeaders = {} }) => {
  const { dateStamp, amzDate } = getAmzDates(date);
  const payload = body || '';
  const payloadHash = sha256Hex(payload);
  const headers = normalizeHeaders({
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...(credentials.sessionToken ? { 'x-amz-security-token': credentials.sessionToken } : {}),
    ...extraHeaders,
  });

  const { canonicalHeaders, signedHeaders } = buildCanonicalHeaders(headers);
  const canonicalRequest = [
    method,
    url.pathname || '/',
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${AWS_SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const signingKey = getSigningKey(credentials.secretAccessKey, dateStamp, region);
  const signature = hmac(signingKey, stringToSign);
  const authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    headers: {
      ...headers,
      authorization,
    },
    amzDate,
    payloadHash,
  };
};

const requestRaw = ({ url, method = 'POST', body = '', headers = {} }) => new Promise((resolve, reject) => {
  const transport = url.protocol === 'http:' ? http : https;
  const request = transport.request(
    {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname || '/'}${url.search || ''}`,
      method,
      headers,
    },
    (response) => {
      let responseBody = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        responseBody += chunk;
      });
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode || 0,
          headers: response.headers,
          body: responseBody,
        });
      });
    }
  );

  request.on('error', reject);
  if (body) {
    request.write(body);
  }
  request.end();
});

const decodeXmlEntities = (value) => String(value || '')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&');

const extractTag = (xml, tag) => {
  const match = xml.match(new RegExp(`<${tag}>([\s\S]*?)<\/${tag}>`));
  return match ? decodeXmlEntities(match[1].trim()) : '';
};

const parseErrorResponse = (xml) => ({
  code: extractTag(xml, 'Code') || 'SQS_ERROR',
  message: extractTag(xml, 'Message') || 'SQS request failed',
  requestId: extractTag(xml, 'RequestId') || '',
});

const parseReceiveMessages = (xml) => {
  const messageBlocks = [...xml.matchAll(/<Message>([\s\S]*?)<\/Message>/g)].map((match) => match[1]);
  return messageBlocks.map((block) => ({
    messageId: extractTag(block, 'MessageId'),
    receiptHandle: extractTag(block, 'ReceiptHandle'),
    body: decodeXmlEntities(extractTag(block, 'Body')),
    md5OfBody: extractTag(block, 'MD5OfBody'),
  }));
};

const invokeAction = async ({ action, params = {}, queueUrl, useQueueUrl = false }) => {
  const credentials = getCredentials();
  if (!credentials.accessKeyId || !credentials.secretAccessKey) {
    throw new Error('AWS credentials are missing for email queue');
  }

  const region = getQueueRegion();
  const targetUrl = useQueueUrl && queueUrl ? new URL(queueUrl) : getBaseEndpoint();
  const bodyParams = new URLSearchParams();
  bodyParams.set('Action', action);
  bodyParams.set('Version', AWS_VERSION);

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        bodyParams.set(`${key}.${index + 1}`, String(entry));
      });
      continue;
    }

    if (value !== undefined && value !== null) {
      bodyParams.set(key, String(value));
    }
  }

  const body = bodyParams.toString();
  const { headers } = buildSignature({
    method: 'POST',
    url: targetUrl,
    body,
    credentials,
    region,
  });

  const response = await requestRaw({
    url: targetUrl,
    method: 'POST',
    body,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
      ...headers,
    },
  });

  if (response.statusCode >= 400) {
    const parsedError = parseErrorResponse(response.body);
    const error = new Error(parsedError.message);
    error.code = parsedError.code;
    error.requestId = parsedError.requestId;
    error.statusCode = response.statusCode;
    throw error;
  }

  return response.body;
};

const resolveQueueUrl = async () => {
  const queueConfig = getQueueConfig();
  if (resolvedQueueUrlCache) {
    return resolvedQueueUrlCache;
  }

  const directQueueUrl = safe(queueConfig.queueUrl);
  if (directQueueUrl) {
    resolvedQueueUrlCache = directQueueUrl;
    return resolvedQueueUrlCache;
  }

  const queueName = safe(queueConfig.queueName);
  if (!queueName) {
    throw new Error('Email queue name or URL is required');
  }

  const xml = await invokeAction({
    action: 'GetQueueUrl',
    params: { QueueName: queueName },
    useQueueUrl: false,
  });

  const queueUrl = extractTag(xml, 'QueueUrl');
  if (!queueUrl) {
    throw new Error('Unable to resolve email queue URL');
  }

  resolvedQueueUrlCache = queueUrl;
  return resolvedQueueUrlCache;
};

const getQueueAttributes = async () => {
  const queueUrl = await resolveQueueUrl();
  const xml = await invokeAction({
    action: 'GetQueueAttributes',
    params: { AttributeName: ['QueueArn'] },
    queueUrl,
    useQueueUrl: true,
  });

  return {
    queueUrl,
    queueArn: extractTag(xml, 'Value'),
  };
};

const enqueueEmailJob = async (job) => {
  if (!isQueueEnabled()) {
    return { queued: false, skipped: true, reason: 'email queue disabled' };
  }

  const queueUrl = await resolveQueueUrl();
  const body = JSON.stringify({
    ...job,
    queuedAt: new Date().toISOString(),
  });

  const xml = await invokeAction({
    action: 'SendMessage',
    params: { MessageBody: body },
    queueUrl,
    useQueueUrl: true,
  });

  return {
    queued: true,
    queueUrl,
    messageId: extractTag(xml, 'MessageId'),
    md5OfMessageBody: extractTag(xml, 'MD5OfMessageBody'),
  };
};

const receiveEmailJobs = async () => {
  if (!isQueueEnabled()) {
    return { messages: [], queueUrl: '', skipped: true, reason: 'email queue disabled' };
  }

  const queueConfig = getQueueConfig();
  const queueUrl = await resolveQueueUrl();
  const xml = await invokeAction({
    action: 'ReceiveMessage',
    params: {
      MaxNumberOfMessages: queueConfig.maxMessages || 10,
      WaitTimeSeconds: queueConfig.waitTimeSeconds || 20,
      VisibilityTimeout: queueConfig.visibilityTimeout || 60,
      AttributeName: ['All'],
      MessageAttributeName: ['All'],
    },
    queueUrl,
    useQueueUrl: true,
  });

  return {
    queueUrl,
    messages: parseReceiveMessages(xml),
  };
};

const deleteEmailJob = async (receiptHandle) => {
  if (!receiptHandle) {
    return { deleted: false, skipped: true, reason: 'receipt handle missing' };
  }

  const queueUrl = await resolveQueueUrl();
  await invokeAction({
    action: 'DeleteMessage',
    params: { ReceiptHandle: receiptHandle },
    queueUrl,
    useQueueUrl: true,
  });

  return { deleted: true, queueUrl };
};

const getEmailQueueHealth = async () => {
  const queueEnabled = isQueueEnabled();
  const queueConfigured = isQueueConfigured();

  if (!queueEnabled) {
    return {
      enabled: false,
      configured: queueConfigured,
      connected: false,
      queueUrl: safe(getQueueConfig().queueUrl) || resolvedQueueUrlCache || '',
      mode: 'disabled',
      error: null,
    };
  }

  if (!queueConfigured) {
    return {
      enabled: true,
      configured: false,
      connected: false,
      queueUrl: safe(getQueueConfig().queueUrl) || resolvedQueueUrlCache || '',
      mode: 'misconfigured',
      error: 'Email queue configuration is incomplete',
    };
  }

  try {
    const attributes = await getQueueAttributes();
    return {
      enabled: true,
      configured: true,
      connected: true,
      queueUrl: attributes.queueUrl,
      queueArn: attributes.queueArn,
      mode: 'sqs',
      error: null,
    };
  } catch (error) {
    logger.error('Email queue health check failed', {
      error: error.message,
      code: error.code,
    });

    return {
      enabled: true,
      configured: true,
      connected: false,
      queueUrl: safe(getQueueConfig().queueUrl) || resolvedQueueUrlCache || '',
      mode: 'sqs',
      error: error.message,
    };
  }
};

export {
  enqueueEmailJob,
  receiveEmailJobs,
  deleteEmailJob,
  resolveQueueUrl,
  getEmailQueueHealth,
  isQueueEnabled,
  isQueueConfigured,
};
