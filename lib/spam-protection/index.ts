import { verifyRecaptcha, RecaptchaResult } from './recaptcha';
import { validateHoneypot } from './honeypot';
import { checkRateLimit, getClientIP, RateLimitResult, RateLimitConfig } from './rate-limit';

export interface SpamCheckResult {
  passed: boolean;
  recaptcha: RecaptchaResult | null;
  rateLimit: RateLimitResult;
  honeypotTriggered: boolean;
  error?: string;
}

export interface SpamCheckOptions {
  request: Request;
  recaptchaToken?: string;
  recaptchaAction: string;
  honeypotValue?: string;
  rateLimitConfig?: RateLimitConfig;
}

/**
 * Comprehensive spam protection check combining:
 * 1. Honeypot validation
 * 2. Rate limiting
 * 3. reCAPTCHA verification
 */
export async function checkSpamProtection(
  options: SpamCheckOptions
): Promise<SpamCheckResult> {
  const { request, recaptchaToken, recaptchaAction, honeypotValue, rateLimitConfig } = options;

  // 1. Check honeypot first (immediate rejection, no API call needed)
  const honeypotResult = validateHoneypot(honeypotValue);
  if (!honeypotResult.valid) {
    console.log('Spam detected: honeypot triggered');
    return {
      passed: false,
      recaptcha: null,
      rateLimit: { allowed: false, remaining: 0, resetTime: 0 },
      honeypotTriggered: true,
      error: 'Bot detected',
    };
  }

  // 2. Check rate limit
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(clientIP, rateLimitConfig);

  if (!rateLimitResult.allowed) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return {
      passed: false,
      recaptcha: null,
      rateLimit: rateLimitResult,
      honeypotTriggered: false,
      error: 'Rate limit exceeded. Please try again later.',
    };
  }

  // 3. Verify reCAPTCHA (if token provided)
  let recaptchaResult: RecaptchaResult | null = null;
  if (recaptchaToken) {
    recaptchaResult = await verifyRecaptcha(recaptchaToken, recaptchaAction);
    if (!recaptchaResult.valid) {
      console.log(`reCAPTCHA failed: ${recaptchaResult.error}`);
      return {
        passed: false,
        recaptcha: recaptchaResult,
        rateLimit: rateLimitResult,
        honeypotTriggered: false,
        error: recaptchaResult.error || 'reCAPTCHA verification failed',
      };
    }
  }

  return {
    passed: true,
    recaptcha: recaptchaResult,
    rateLimit: rateLimitResult,
    honeypotTriggered: false,
  };
}

// Re-export individual utilities for direct use
export { verifyRecaptcha, validateHoneypot, checkRateLimit, getClientIP };
export type { RecaptchaResult, RateLimitResult, RateLimitConfig };
