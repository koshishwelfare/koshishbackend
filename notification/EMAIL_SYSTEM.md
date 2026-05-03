# Email Notification System - Improvements

## Overview

The email notification system has been enhanced with comprehensive logging, validation, retry logic, and connection pooling for better reliability and debugging.

## New Features

### 1. **Comprehensive Logging**

- All email operations are logged to `logs/email.log`
- Failed attempts tracked with error codes and messages
- Health check endpoint for monitoring
- Separate error logs in `logs/errors.log`

### 2. **Email Validation**

- Email addresses validated before sending
- Supports single or comma-separated recipients
- Parameter validation (subject, content)
- Sanitization of email addresses

### 3. **Automatic Retry with Exponential Backoff**

- Retries failed emails up to 3 times by default
- Exponential backoff: 1s → 2s → 4s delays
- Logs each retry attempt
- Graceful failure after all retries exhausted

### 4. **Connection Pooling**

- Reuses SMTP connection instead of creating new one each time
- Max 5 concurrent connections
- Max 100 messages per connection
- Rate limiting (14 messages per 4 seconds)

### 5. **Email Health Check**

- Endpoint: `GET /api/health/email`
- Returns: `{ configured: boolean, connected: boolean, error?: string, queue?: object }`
- Verifies SMTP connection and queue configuration

### 6. **Optional Amazon SQS Queue**

- Email jobs can be queued into Amazon SQS instead of sending immediately
- Worker drains the queue and sends via the existing SMTP transport
- Queue mode is optional and falls back to SMTP if disabled or unavailable

## File Structure

```
notification/
├── services/
│   ├── mailer.js              # Enhanced email sender with retries, logging & queue fallback
│   ├── emailValidator.js      # Email validation utilities
│   ├── logger.js              # Winston logger configuration
│   └── sqsQueue.js            # Amazon SQS client for email jobs
├── templates/
│   └── emailTemplates.js      # Email templates
└── index.js                   # Main export file
```

## Environment Variables Required

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Optional Amazon SQS Queue
EMAIL_QUEUE_ENABLED=true
EMAIL_QUEUE_PROVIDER=sqs
AWS_REGION=ap-south-1
EMAIL_QUEUE_URL=https://sqs.ap-south-1.amazonaws.com/123456789012/koshish-email-queue
EMAIL_QUEUE_NAME=koshish-email-queue
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_SESSION_TOKEN=optional-session-token
AWS_SQS_ENDPOINT=
EMAIL_QUEUE_WAIT_TIME_SECONDS=20
EMAIL_QUEUE_VISIBILITY_TIMEOUT=60
EMAIL_QUEUE_MAX_MESSAGES=10
EMAIL_QUEUE_POLL_DELAY_MS=5000

# Logging (optional)
LOG_LEVEL=debug  # debug, info, warn, error
NODE_ENV=development
```

## API Changes

### Email Functions (return values enhanced)

All email functions now return detailed response objects:

```javascript
{
  sent: boolean,
  messageId?: string,           // If successful
  response?: string,            // SMTP response
  error?: string,              // Error message if failed
  attempts: number             // Number of attempts made
}
```

### New Endpoints

- `GET /api/health/email` - Check email system health
- `npm run email:worker` - Start the SQS email worker

## Usage Examples

### Check Email System Health

```bash
curl http://localhost:5000/api/health/email
```

Response (if working):

```json
{
  "configured": true,
  "connected": true,
  "error": null
}
```

### Send Credentials Email (Same API, better error handling)

```javascript
import { sendCredentialTemplateEmail } from './notification/index.js';

const result = await sendCredentialTemplateEmail({
  to: 'user@example.com',
  name: 'John Doe',
  username: 'john.doe',
  password: 'temp-password-123',
  label: 'Account Created',
});

// Enhanced response
console.log(result);
// {
//   sent: true,
//   messageId: '<abc123@smtp.gmail.com>',
//   response: '250 2.0.0 OK...',
//   attempts: 1
// }
```

### Validate Email Before Use

```javascript
import { validateRecipients, isValidEmail } from './notification/index.js';

// Single email
const isValid = isValidEmail('user@example.com'); // true

// Multiple recipients
const validation = validateRecipients('user1@example.com, user2@example.com');
if (validation.valid) {
  console.log('All emails valid');
} else {
  console.log('Invalid emails:', validation.invalid);
}
```

## Logging

Logs are stored in `koshishbackend/logs/` directory:

- **email.log** - All email operations (sends, retries, failures)
- **errors.log** - Only error-level logs
- **combined.log** - All logs at all levels
- **exceptions.log** - Uncaught exceptions

View logs:

```bash
# Recent email logs
tail -f logs/email.log

# Real-time debug
cat logs/combined.log | grep "Email"
```

## Troubleshooting

### Emails Not Sending

1. **Check configuration**

   ```bash
   curl http://localhost:5000/api/health/email
   ```

2. **Check logs**

   ```bash
   tail -f logs/email.log
   ```

3. **Common issues**
   - Missing `.env` variables → Check `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
   - Gmail 2FA → Use App Passwords (not regular password)
   - Rate limiting → System automatically backs off on failures
   - Firewall → Ensure port 587 (TLS) or 465 (SSL) is open

### Debug Email Sending

Enable debug logging:

```bash
LOG_LEVEL=debug node server.js
```

### Test Email Manually

```javascript
import { sendCredentialTemplateEmail } from './notification/index.js';

const result = await sendCredentialTemplateEmail({
  to: 'test@gmail.com',
  name: 'Test User',
  username: 'testuser',
  password: 'testpass123',
  label: 'Test Email',
});

console.log(result);
```

## Performance Improvements

| Aspect           | Before                         | After                                     |
| ---------------- | ------------------------------ | ----------------------------------------- |
| Connection Reuse | ❌ New connection each time    | ✅ Connection pooling                     |
| Error Handling   | Silent failures                | ✅ Full logging                           |
| Retries          | None                           | ✅ 3 attempts with backoff                |
| Email Validation | None                           | ✅ Format + content validation            |
| Debugging        | Difficult                      | ✅ Detailed logs & metrics                |
| Response Detail  | `{ sent: true/false, reason }` | ✅ `{ sent, messageId, attempts, error }` |

## Queue Mode

### How It Works

1. `sendCredentialTemplateEmail()`, `sendAuthNotificationEmail()`, and `sendHolidayNotificationEmail()` build the email payload
2. If `EMAIL_QUEUE_ENABLED=true`, the payload is published to SQS
3. The worker process (`npm run email:worker`) reads the queue and sends the message via SMTP
4. If SQS is unavailable, the mailer falls back to direct SMTP sending

### Worker Behavior

- Long polls SQS for new email jobs
- Deletes a message only after SMTP send succeeds
- Leaves failed jobs on the queue so SQS can retry them
- Logs all queue activity to `logs/email.log`

## Future Enhancements

- [ ] Add rate limiting per user
- [ ] Email template versioning
- [ ] Attachment support
- [ ] HTML template builder UI
- [ ] Email delivery metrics dashboard
- [ ] Webhook support for delivery status

## Migration Guide

**No code changes required!** The email API is backward compatible:

Old code:

```javascript
const result = await sendCredentialTemplateEmail({
  to,
  name,
  username,
  password,
  label,
});
if (result.sent) {
  // Email sent
}
```

New code (same API, better info):

```javascript
const result = await sendCredentialTemplateEmail({
  to,
  name,
  username,
  password,
  label,
});
if (result.sent) {
  console.log('Message ID:', result.messageId);
  console.log('Attempts:', result.attempts);
} else {
  console.error('Failed:', result.error);
  console.log('Retry attempts:', result.attempts);
}
```

## Support

For issues or questions:

1. Check the logs: `logs/email.log`
2. Verify SMTP config: `GET /api/health/email`
3. Review this documentation
4. Check environment variables in `.env`
