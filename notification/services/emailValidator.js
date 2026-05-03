import validator from 'validator';

/**
 * Validate email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return validator.isEmail(email.trim());
};

/**
 * Validate recipient email(s) - can be single or multiple comma-separated
 * @param {string|string[]} recipients - Email(s) to validate
 * @returns {object} - { valid: boolean, invalid: string[], message: string }
 */
export const validateRecipients = (recipients) => {
  if (!recipients) {
    return { valid: false, invalid: [], message: 'No recipients provided' };
  }

  let emails = [];
  
  if (Array.isArray(recipients)) {
    emails = recipients;
  } else if (typeof recipients === 'string') {
    // Split by comma and trim each email
    emails = recipients.split(',').map(e => e.trim()).filter(e => e);
  }

  if (emails.length === 0) {
    return { valid: false, invalid: [], message: 'No valid recipients provided' };
  }

  const invalid = emails.filter(email => !isValidEmail(email));

  if (invalid.length > 0) {
    return {
      valid: false,
      invalid,
      message: `Invalid email address(es): ${invalid.join(', ')}`
    };
  }

  return { valid: true, invalid: [], message: 'All recipients valid' };
};

/**
 * Sanitize email address
 * @param {string} email - Email to sanitize
 * @returns {string} - Sanitized email
 */
export const sanitizeEmail = (email) => {
  if (!email) return '';
  return validator.trim(validator.normalizeEmail(email));
};

/**
 * Validate email sending parameters
 * @param {object} params - Email parameters
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export const validateEmailParams = ({ to, subject, text, html }) => {
  const errors = [];

  // Validate recipient
  if (!to) {
    errors.push('Recipient (to) is required');
  } else {
    const recipientValidation = validateRecipients(to);
    if (!recipientValidation.valid) {
      errors.push(recipientValidation.message);
    }
  }

  // Validate subject
  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    errors.push('Subject is required and must be a non-empty string');
  }

  // Validate content (need at least text or html)
  if ((!text || text.trim().length === 0) && (!html || html.trim().length === 0)) {
    errors.push('Email must have either text or html content');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
