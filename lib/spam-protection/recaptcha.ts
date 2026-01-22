// reCAPTCHA Enterprise configuration
const RECAPTCHA_API_KEY = process.env.RECAPTCHA_API_KEY;
const RECAPTCHA_PROJECT_ID = process.env.RECAPTCHA_PROJECT_ID;
const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
const RECAPTCHA_SCORE_THRESHOLD = 0.5;

interface RecaptchaEnterpriseResponse {
  name: string;
  event: {
    token: string;
    siteKey: string;
    userAgent: string;
    userIpAddress: string;
    expectedAction: string;
  };
  riskAnalysis: {
    score: number;
    reasons: string[];
  };
  tokenProperties: {
    valid: boolean;
    invalidReason?: string;
    hostname: string;
    action: string;
    createTime: string;
  };
}

export interface RecaptchaResult {
  valid: boolean;
  score: number;
  error?: string;
}

export async function verifyRecaptcha(
  token: string | undefined,
  expectedAction: string
): Promise<RecaptchaResult> {
  // If reCAPTCHA is not configured, allow the request (graceful degradation)
  if (!RECAPTCHA_API_KEY || !RECAPTCHA_PROJECT_ID || !RECAPTCHA_SITE_KEY) {
    console.warn('reCAPTCHA Enterprise not fully configured - skipping verification');
    return { valid: true, score: 1.0 };
  }

  // If no token provided, fail verification
  if (!token) {
    return { valid: false, score: 0, error: 'No reCAPTCHA token provided' };
  }

  try {
    // Call reCAPTCHA Enterprise Assessment API
    const response = await fetch(
      `https://recaptchaenterprise.googleapis.com/v1/projects/${RECAPTCHA_PROJECT_ID}/assessments?key=${RECAPTCHA_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: {
            token: token,
            expectedAction: expectedAction,
            siteKey: RECAPTCHA_SITE_KEY,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('reCAPTCHA Enterprise API error:', errorText);
      return {
        valid: false,
        score: 0,
        error: `API error: ${response.status}`,
      };
    }

    const data: RecaptchaEnterpriseResponse = await response.json();

    // Check if token is valid
    if (!data.tokenProperties?.valid) {
      return {
        valid: false,
        score: 0,
        error: `Invalid token: ${data.tokenProperties?.invalidReason || 'unknown'}`,
      };
    }

    // Check action matches
    if (data.tokenProperties.action !== expectedAction) {
      return {
        valid: false,
        score: data.riskAnalysis?.score || 0,
        error: 'reCAPTCHA action mismatch',
      };
    }

    // Check score threshold
    const score = data.riskAnalysis?.score || 0;
    if (score < RECAPTCHA_SCORE_THRESHOLD) {
      return {
        valid: false,
        score: score,
        error: `Score too low: ${score}`,
      };
    }

    return { valid: true, score: score };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return { valid: false, score: 0, error: 'Verification request failed' };
  }
}
