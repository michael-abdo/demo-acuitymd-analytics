/**
 * Email Validation Utilities
 * SECURITY: Validate email addresses before sending
 */

// RFC 5322 compliant email regex (simplified but robust)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Maximum email length per RFC 5321
const MAX_EMAIL_LENGTH = 254;

// Blocked domains for security
const BLOCKED_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'throwaway.email',
  '10minutemail.com',
  'guerrillamail.com',
]);

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * SECURITY: Validate a single email address
 */
export function validateEmail(email: string): EmailValidationResult {
  // Check for empty input
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  // Trim and lowercase
  const sanitized = email.trim().toLowerCase();

  // Check length
  if (sanitized.length === 0) {
    return { isValid: false, error: 'Email cannot be empty' };
  }

  if (sanitized.length > MAX_EMAIL_LENGTH) {
    return { isValid: false, error: `Email cannot exceed ${MAX_EMAIL_LENGTH} characters` };
  }

  // Check format
  if (!EMAIL_REGEX.test(sanitized)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // Extract domain
  const domain = sanitized.split('@')[1];
  if (!domain) {
    return { isValid: false, error: 'Invalid email format' };
  }

  // Check for blocked domains (optional - can be disabled in config)
  if (process.env.BLOCK_DISPOSABLE_EMAILS === 'true' && BLOCKED_DOMAINS.has(domain)) {
    return { isValid: false, error: 'Disposable email addresses are not allowed' };
  }

  return { isValid: true, sanitized };
}

/**
 * SECURITY: Validate multiple email addresses
 */
export function validateEmails(emails: string[]): {
  valid: string[];
  invalid: Array<{ email: string; error: string }>;
} {
  const valid: string[] = [];
  const invalid: Array<{ email: string; error: string }> = [];

  for (const email of emails) {
    const result = validateEmail(email);
    if (result.isValid && result.sanitized) {
      valid.push(result.sanitized);
    } else {
      invalid.push({ email, error: result.error || 'Invalid email' });
    }
  }

  return { valid, invalid };
}

/**
 * SECURITY: Sanitize email for safe usage
 *
 * Note: This function returns null for invalid emails without details.
 * Use validateEmail() instead if you need to know why validation failed.
 * Use validateEmails() for bulk validation with detailed error reporting.
 */
export function sanitizeEmail(email: string): string | null {
  const result = validateEmail(email);
  if (!result.isValid) {
    console.warn(`[Email Validation] Invalid email "${email}": ${result.error}`);
    return null;
  }
  return result.sanitized || null;
}

/**
 * SECURITY: Sanitize multiple emails with detailed failure reporting
 * Returns both sanitized valid emails and details about which ones failed
 */
export function sanitizeEmailsWithReport(emails: string[]): {
  sanitized: string[];
  failed: Array<{ email: string; reason: string }>;
  summary: string;
} {
  const result = validateEmails(emails);
  const summary = result.invalid.length > 0
    ? `${result.valid.length} valid, ${result.invalid.length} invalid: ${result.invalid.map(e => `"${e.email}" (${e.error})`).join(', ')}`
    : `All ${result.valid.length} emails valid`;

  if (result.invalid.length > 0) {
    console.warn(`[Email Validation] ${summary}`);
  }

  return {
    sanitized: result.valid,
    failed: result.invalid.map(e => ({ email: e.email, reason: e.error })),
    summary
  };
}
