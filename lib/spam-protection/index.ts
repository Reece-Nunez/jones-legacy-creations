import { verifyRecaptcha, RecaptchaResult } from './recaptcha';
import { validateHoneypot } from './honeypot';
import { checkRateLimit, getClientIP, RateLimitResult, RateLimitConfig } from './rate-limit';
import { validateContent, ContentCheckOptions, ContentCheckResult } from './content-validation';

export interface SpamCheckResult {
  passed: boolean;
  recaptcha: RecaptchaResult | null;
  rateLimit: RateLimitResult;
  honeypotTriggered: boolean;
  contentCheck: ContentCheckResult | null;
  error?: string;
}

export interface SpamCheckOptions {
  request: Request;
  recaptchaToken?: string;
  recaptchaAction: string;
  honeypotValue?: string;
  rateLimitConfig?: RateLimitConfig;
  contentCheck?: ContentCheckOptions;
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
  const { request, recaptchaToken, recaptchaAction, honeypotValue, rateLimitConfig, contentCheck } = options;

  // 1. Check honeypot first (immediate rejection, no API call needed)
  const honeypotResult = validateHoneypot(honeypotValue);
  if (!honeypotResult.valid) {
    console.log('Spam detected: honeypot triggered');
    return {
      passed: false,
      recaptcha: null,
      rateLimit: { allowed: false, remaining: 0, resetTime: 0 },
      honeypotTriggered: true,
      contentCheck: null,
      error: 'Bot detected',
    };
  }

  // 2. Check content for gibberish/spam patterns
  if (contentCheck) {
    const contentResult = validateContent(contentCheck);
    if (!contentResult.valid) {
      const firstError = Object.values(contentResult.errors)[0];
      console.log('Spam detected: content validation failed', contentResult.errors);
      return {
        passed: false,
        recaptcha: null,
        rateLimit: { allowed: false, remaining: 0, resetTime: 0 },
        honeypotTriggered: false,
        contentCheck: contentResult,
        error: firstError || 'Invalid content detected',
      };
    }
  }

  // 3. Check rate limit
  const clientIP = getClientIP(request);
  const rateLimitResult = checkRateLimit(clientIP, rateLimitConfig);

  if (!rateLimitResult.allowed) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return {
      passed: false,
      recaptcha: null,
      rateLimit: rateLimitResult,
      honeypotTriggered: false,
      contentCheck: null,
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
        contentCheck: null,
        error: recaptchaResult.error || 'reCAPTCHA verification failed',
      };
    }
  }

  return {
    passed: true,
    recaptcha: recaptchaResult,
    rateLimit: rateLimitResult,
    honeypotTriggered: false,
    contentCheck: null,
  };
}

// Re-export individual utilities for direct use
export { verifyRecaptcha, validateHoneypot, checkRateLimit, getClientIP, validateContent };
export type { RecaptchaResult, RateLimitResult, RateLimitConfig, ContentCheckOptions, ContentCheckResult };
