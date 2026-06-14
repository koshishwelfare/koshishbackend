# Email Notification System

The backend sends notification email through one queue provider only:

- **BullMQ** for job scheduling and retry handling
- **Redis** for queue storage
- **Nodemailer SMTP** inside the worker process for actual delivery

There is no secondary queue provider or direct-send fallback path.

## Runtime Flow

1. Controllers call helpers from `notification/index.js`.
2. The helper validates the email payload and enqueues a BullMQ job.
3. `npm run email:worker` consumes jobs from Redis.
4. The worker sends email via SMTP with retry handling.

## Required Environment

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

REDIS_URL=redis://localhost:6379
EMAIL_QUEUE_NAME=email-notifications
EMAIL_QUEUE_CONCURRENCY=5
EMAIL_QUEUE_ATTEMPTS=3
EMAIL_QUEUE_BACKOFF_DELAY_MS=5000
```

For hosted Redis providers that require TLS, use a `rediss://...` URL.

## Commands

```bash
npm start
npm run email:worker
```

On Render, run the API and worker as separate services using the same environment variables and Redis instance.

## Health Check

```bash
GET /api/health/email
```

The response includes SMTP status plus BullMQ queue status:

```json
{
  "configured": true,
  "connected": true,
  "error": null,
  "queue": {
    "provider": "bullmq",
    "configured": true,
    "connected": true,
    "queueName": "email-notifications",
    "counts": {
      "waiting": 0,
      "active": 0,
      "completed": 0,
      "failed": 0,
      "delayed": 0
    }
  }
}
```
