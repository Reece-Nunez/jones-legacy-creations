"use client";

import { useCallback, useEffect } from "react";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

declare global {
  interface Window {
    grecaptcha: {
      enterprise: {
        ready: (callback: () => void) => void;
        execute: (siteKey: string, options: { action: string }) => Promise<string>;
      };
    };
  }
}

function loadRecaptchaScript() {
  if (!RECAPTCHA_SITE_KEY) return;
  if (document.querySelector(`script[src*="recaptcha/enterprise.js"]`)) return;

  const script = document.createElement("script");
  script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`;
  script.async = true;
  document.head.appendChild(script);
}

/**
 * Hook to execute reCAPTCHA Enterprise and get a token.
 * Automatically loads the reCAPTCHA script when first used.
 */
export function useRecaptcha() {
  useEffect(() => {
    loadRecaptchaScript();
  }, []);

  const executeRecaptcha = useCallback(async (action: string): Promise<string | null> => {
    if (!RECAPTCHA_SITE_KEY) {
      console.warn('reCAPTCHA site key not configured');
      return null;
    }

    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.grecaptcha?.enterprise) {
        window.grecaptcha.enterprise.ready(() => {
          window.grecaptcha.enterprise
            .execute(RECAPTCHA_SITE_KEY, { action })
            .then(resolve)
            .catch((error) => {
              console.error('reCAPTCHA execution error:', error);
              resolve(null);
            });
        });
      } else {
        console.warn('reCAPTCHA Enterprise not loaded');
        resolve(null);
      }
    });
  }, []);

  return { executeRecaptcha };
}
