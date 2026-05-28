"use client";

/**
 * Inline newsletter signup — editorial-style horizontal input + button.
 *
 * Drops into the Footer (above the 3-column colophon) and can be
 * placed anywhere else by passing a different `source` prop. The
 * `source` field gets stored on the subscriber row so we can later
 * see which placements convert best.
 *
 * No real lead-magnet PDF yet (Blake hasn't written one) — the copy
 * promises "updates worth reading" which is honest and low-friction.
 * When the PDF lands, swap the success-state message to include the
 * download link.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Check, Loader2, Send } from "lucide-react";
import {
  subscribeFormSchema,
  type SubscribeFormData,
} from "@/lib/schemas/subscribe";
import { HoneypotField } from "@/components/ui/HoneypotField";
import { useRecaptcha } from "@/components/ReCaptchaProvider";
import { trackLead } from "@/lib/analytics";

interface Props {
  /** Where on the site this signup is placed. Stored on the
   *  subscriber row for placement attribution. */
  source?:
    | "footer"
    | "homepage"
    | "estimate_page"
    | "construction_page"
    | "real_estate_page"
    | "interior_design_page"
    | "lead_magnet"
    | "blog"
    | "other";
  /** Override the default copy. */
  heading?: string;
  subheading?: string;
}

type FormShape = SubscribeFormData & { honeypot?: string };

export function NewsletterSignup({
  source = "footer",
  heading = "Stay in the loop",
  subheading = "Occasional notes on new builds, Southern Utah real estate, and the work happening behind the scenes.",
}: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { executeRecaptcha } = useRecaptcha();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormShape>({
    resolver: zodResolver(subscribeFormSchema),
  });

  async function onSubmit(data: FormShape) {
    setIsSubmitting(true);
    try {
      const recaptchaToken = await executeRecaptcha("subscribe");
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, source, recaptchaToken }),
      });
      if (!response.ok) throw new Error("Subscribe failed");

      // Lower per-lead EV than the form/listing leads — newsletter
      // signups are top-of-funnel, much further from a closed deal.
      trackLead({ source: "newsletter", value: 100 });
      setSubmitted(true);
      reset();
    } catch {
      toast.error("Couldn't sign you up. Try again in a sec.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-label="Newsletter signup"
      className="border-t border-b border-black/10 py-10 sm:py-12"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1.5fr] gap-8 md:gap-12 items-start md:items-center">
        <div>
          <p
            className="font-mono uppercase mb-2"
            style={{
              fontSize: "10px",
              letterSpacing: "0.22em",
              color: "var(--hm-ink-3)",
            }}
          >
            Newsletter
          </p>
          <h2
            className="font-serif italic mb-2"
            style={{
              fontSize: "var(--hm-text-h3)",
              color: "var(--hm-ink)",
              letterSpacing: "-0.01em",
            }}
          >
            {heading}
          </h2>
          <p
            className="font-sans"
            style={{
              fontSize: "var(--hm-text-body)",
              color: "var(--hm-ink-2)",
              lineHeight: 1.55,
              maxWidth: "44ch",
            }}
          >
            {subheading}
          </p>
        </div>

        {submitted ? (
          <div
            className="flex items-start gap-3"
            style={{
              borderLeft: "3px solid #10b981",
              paddingLeft: "16px",
              color: "var(--hm-ink-2)",
            }}
          >
            <Check className="h-5 w-5 mt-0.5 text-emerald-600 shrink-0" />
            <div>
              <p
                className="font-mono uppercase mb-1"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.22em",
                  color: "var(--hm-ink-3)",
                }}
              >
                You&apos;re on the list
              </p>
              <p
                className="font-sans"
                style={{
                  fontSize: "var(--hm-text-body)",
                  color: "var(--hm-ink-2)",
                  lineHeight: 1.55,
                }}
              >
                Check your inbox for a confirmation. You can unsubscribe
                any time from the link in any email we send.
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-2"
          >
            <HoneypotField register={register} />
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                {...register("email")}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                aria-label="Your email"
                className="flex-1 bg-transparent border-0 border-b border-[var(--hm-rule-thick)] focus:border-[var(--hm-ink)] focus:outline-none px-0 py-3 text-base font-sans transition-colors placeholder:text-[var(--hm-ink-3)]"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-2 font-mono uppercase border bg-[var(--hm-ink)] text-[var(--hm-paper)] border-[var(--hm-ink)] hover:bg-[var(--hm-accent)] hover:border-[var(--hm-accent)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed self-start sm:self-auto"
                style={{
                  fontSize: "var(--hm-text-meta)",
                  letterSpacing: "0.15em",
                  padding: "0.875rem 1.5rem",
                  minHeight: 44,
                  whiteSpace: "nowrap",
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing up…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Sign Up
                  </>
                )}
              </button>
            </div>
            {errors.email && (
              <p className="text-xs text-rose-600">{errors.email.message}</p>
            )}
            <p
              className="font-mono uppercase mt-1"
              style={{
                fontSize: "10px",
                letterSpacing: "0.18em",
                color: "var(--hm-ink-3)",
              }}
            >
              No spam · Unsubscribe any time
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
