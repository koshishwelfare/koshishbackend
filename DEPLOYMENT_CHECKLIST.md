# ✅ DEPLOYMENT & VERIFICATION CHECKLIST

## Pre-Deployment Checklist

### 1. Code Review

- [ ] All files deployed from `notification/` folder
  - [ ] `services/logger.js`
  - [ ] `services/emailValidator.js`
  - [ ] `services/mailer.js`
  - [ ] `templates/emailTemplates.js`
  - [ ] `index.js`
- [ ] Route added: `routes/healthRoutes.js`
- [ ] Server updated: `server.js` imports health routes

### 2. Environment Setup

- [ ] `.env` file exists in `koshishbackend/` root
- [ ] `.env` contains SMTP_HOST
- [ ] `.env` contains SMTP_PORT
- [ ] `.env` contains SMTP_USER
- [ ] `.env` contains SMTP_PASS
- [ ] `.env` contains SMTP_FROM (or will use SMTP_USER)
- [ ] `.gitignore` includes `.env` (don't commit credentials)

### 3. Dependencies

- [ ] `npm install` completed successfully
- [ ] `nodemailer` in package.json (already there)
- [ ] `winston` in package.json (already there)
- [ ] `validator` in package.json (already there)
- [ ] No `npm` errors or warnings

### 4. MongoDB & Cloudinary

- [ ] MongoDB connection working (from before)
- [ ] Cloudinary configuration working (from before)
- [ ] Database accessible from deployment server

---

## Deployment Steps

### 1. Pull Code

```bash
cd koshishbackend
git pull origin main
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure SMTP

```bash
# Edit .env with your email settings
nano .env
```

Add/update:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
```

### 4. Start Server

```bash
npm start
```

### 5. Wait for logs directory

```bash
ls -la logs/
# Should show: email.log, errors.log, combined.log (may appear after first operation)
```

---

## Post-Deployment Verification

### 1. Server Health

- [ ] Server starts without errors
- [ ] No "Cannot find module" errors
- [ ] No "EADDRINUSE" port already in use errors
- [ ] Port 5000 (or configured) is listening

### 2. Email System Health

```bash
curl http://localhost:5000/api/health/email
```

Expected response:

```json
{
  "configured": true,
  "connected": true,
  "error": null
}
```

- [ ] Returns 200 status code
- [ ] `configured` is `true`
- [ ] `connected` is `true`
- [ ] No error message

### 3. Logs Directory

```bash
ls -la logs/
```

- [ ] Directory exists
- [ ] Has `email.log` (or will be created on first email)
- [ ] Has `errors.log` (or will be created on error)
- [ ] Has `combined.log` (or will be created on first operation)

### 4. Test Email Send

```bash
# In code or test file:
import { sendCredentialTemplateEmail } from './notification/index.js';

const result = await sendCredentialTemplateEmail({
  to: 'test@example.com',
  name: 'Test User',
  username: 'testuser',
  password: 'testpass123',
  label: 'Test'
});

console.log(result);
// Should show: { sent: true, messageId: '...', attempts: 1 }
```

- [ ] Email sends without errors
- [ ] Returns `{ sent: true }` or similar
- [ ] Check `logs/email.log` shows the operation

### 5. Logs Verification

```bash
tail -f logs/email.log
```

- [ ] Email operation is logged
- [ ] Shows timestamp, from, to, subject
- [ ] Shows `sent` or `error` status
- [ ] Shows `messageId` if successful

### 6. Backward Compatibility

```bash
# Test existing email-sending controller
# E.g., login should send auth notification email
```

- [ ] Existing controllers still work
- [ ] No code changes needed to controllers
- [ ] Emails still send from existing flows
- [ ] New logging appears in logs/email.log

### 7. Error Handling

```bash
# Test with invalid email address
import { sendCredentialTemplateEmail } from './notification/index.js';

const result = await sendCredentialTemplateEmail({
  to: 'invalid-email',  // Invalid format
  name: 'Test',
  username: 'test',
  password: 'pass',
  label: 'Test'
});

console.log(result);
// Should show: { sent: false, error: 'Invalid email...', attempts: 0 }
```

- [ ] Returns `{ sent: false }`
- [ ] Includes detailed error message
- [ ] Does not crash server
- [ ] Error logged to `logs/errors.log` (if retried)

---

## Health Check Verification

### Endpoint: GET /api/health/email

#### Scenario 1: All Good

```bash
curl http://localhost:5000/api/health/email
# Response:
{
  "configured": true,
  "connected": true,
  "error": null
}
# Status: 200
```

- [ ] Response indicates OK
- [ ] Status code 200

#### Scenario 2: Not Configured

```bash
# If SMTP_* env vars missing
curl http://localhost:5000/api/health/email
# Response:
{
  "configured": false,
  "connected": false,
  "error": "Missing SMTP configuration"
}
# Status: 503
```

- [ ] Response indicates issue
- [ ] Error message explains problem
- [ ] Status code 503

#### Scenario 3: Connection Refused

```bash
# If SMTP server unreachable
curl http://localhost:5000/api/health/email
# Response:
{
  "configured": true,
  "connected": false,
  "error": "connect ECONNREFUSED..."
}
# Status: 503
```

- [ ] Response indicates connection issue
- [ ] Error contains useful debugging info
- [ ] Status code 503

---

## Logging Verification

### Log Files Location

```bash
koshishbackend/logs/
├── email.log          # All email operations
├── errors.log         # Errors only
├── combined.log       # All logs
└── exceptions.log     # Exceptions
```

### Email Log Format

```
2026-05-03 14:23:45:123 info: Email sent successfully
{
  "to": "user@example.com",
  "subject": "Account Created",
  "messageId": "<abc123@smtp.gmail.com>",
  "attempt": 1,
  "response": "250 2.0.0 OK"
}
```

- [ ] Can read email.log
- [ ] Shows successful sends
- [ ] Shows attempts/retries
- [ ] Shows errors with details

### Debug Logging

```bash
LOG_LEVEL=debug npm start
tail -f logs/combined.log | grep -i "email\|retry"
```

- [ ] Debug mode can be enabled
- [ ] Shows extra details
- [ ] Shows connection info
- [ ] Shows validation details

---

## Monitoring & Maintenance

### Daily Checks

- [ ] Check `logs/email.log` for errors
- [ ] Monitor `/api/health/email` endpoint
- [ ] Review sent/failed counts in logs

### Weekly Tasks

- [ ] Archive old log files if too large
- [ ] Review error patterns
- [ ] Check email delivery success rate

### Monthly Review

- [ ] Analyze email performance
- [ ] Check for any reliability issues
- [ ] Plan for improvements (queue system, etc.)

---

## Rollback Plan

If something goes wrong:

### Option 1: Quick Fix

```bash
# Fix .env settings
nano .env
# Restart
npm start
```

### Option 2: Restore Previous

```bash
git reset --hard HEAD~1
npm install
npm start
```

### Option 3: Contact Support

- Check `DOCUMENTATION_INDEX.md` for where to find help
- Review `logs/email.log` for error details
- Run `curl http://localhost:5000/api/health/email` for diagnostics

---

## Troubleshooting During Deployment

### Issue: "Cannot find module 'winston'"

```bash
Solution: npm install
```

### Issue: "EADDRINUSE: address already in use :::5000"

```bash
Solution: Kill process on port 5000 or change PORT env var
```

### Issue: Health endpoint returns error

```bash
Solution:
1. Check .env has SMTP_* variables
2. Test SMTP connection manually
3. Verify firewall allows port 587/465
```

### Issue: Emails not sending

```bash
Solution:
1. Check logs/email.log for details
2. Run: curl http://localhost:5000/api/health/email
3. Verify SMTP credentials
4. For Gmail: Use App Password, not regular password
```

### Issue: No logs appearing

```bash
Solution:
1. Logs auto-created on first operation
2. Try sending test email
3. Check ls -la logs/
4. If still empty: npm start with LOG_LEVEL=debug
```

---

## Sign-Off

- [ ] All checklist items completed
- [ ] Email system health verified
- [ ] Logs appear correctly
- [ ] Existing controllers work
- [ ] Documentation reviewed
- [ ] Rollback plan understood
- [ ] Team notified of changes

**Deployment Status:** ✅ Ready for Production

**Date:** ******\_\_\_******  
**Deployed By:** ******\_\_\_******  
**Verified By:** ******\_\_\_******

---

## Contact & Support

- **Documentation:** `DOCUMENTATION_INDEX.md`
- **Quick Reference:** `MAIL_QUICK_REFERENCE.md`
- **Full Guide:** `EMAIL_SYSTEM.md`
- **Deployment Guide:** `IMPLEMENTATION_SUMMARY.md`
- **Issues?** Check `logs/email.log` first

---

**🎉 Deployment Complete!**

All email-sending functionality is now enhanced with logging, retry logic, validation, and monitoring. No code changes required in existing controllers.
