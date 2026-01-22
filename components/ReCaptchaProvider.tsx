"use client";

import Script from "next/script";
import { useCallback } from "react";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

// Extend Window interface for grecaptcha enterprise
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

/**
 * Provider component that loads the Google reCAPTCHA Enterprise script.
 * Add this component to your root layout.
 */
export function ReCaptchaProvider() {
  if (!RECAPTCHA_SITE_KEY) {
    return null;
  }

  return (
    <Script
      src={`https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`}
      strategy="afterInteractive"
    />
  );
}

/**
 * Hook to execute reCAPTCHA Enterprise and get a token.
 * Use this in your form components before submission.
 *
 * @example
 * const { executeRecaptcha } = useRecaptcha();
 *
 * const onSubmit = async (data) => {
 *   const token = await executeRecaptcha('contact_form');
 *   // Include token in your API request
 * };
 */
export function useRecaptcha() {
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
