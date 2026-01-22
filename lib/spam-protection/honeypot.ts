export interface HoneypotResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that the honeypot field is empty.
 * Bots typically fill in all form fields, including hidden ones.
 * If the honeypot field has a value, it's likely a bot submission.
 */
export function validateHoneypot(value: string | undefined): HoneypotResult {
  if (value && value.length > 0) {
    return {
      valid: false,
      error: 'Bot detected - honeypot field was filled',
    };
  }

  return { valid: true };
}
