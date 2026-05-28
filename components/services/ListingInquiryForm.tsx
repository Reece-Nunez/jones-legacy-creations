"use client";

/**
 * Listing-page inquiry form — the missing conversion mechanism on
 * real-estate listing detail pages.
 *
 * Before this, the only CTAs on a listing detail page were "View on
 * MLS" (external) and "Call (435) 288-9807" (tel:). Both high-intent
 * but mobile visitors rarely call cold; they want a form. This drops
 * a 4-field capture (name / email / phone / message) below the
 * description and fires the same lead pipeline as every other form:
 *   1. captureLead() into the leads table
 *   2. Resend the customer + Blake the notification
 *   3. trackLead() fires GA4 generate_lead + Meta Pixel Lead events
 *      with the listing context baked into the raw_payload.
 *
 * Pre-fills the message with "I'm interested in <address>." — the
 * user only has to add specifics if they want.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { Loader2, Send } from "lucide-react";
import {
  listingInquiryFormSchema,
  type ListingInquiryFormData,
} from "@/lib/schemas/listing-inquiry";
import { HoneypotField } from "@/components/ui/HoneypotField";
import { useRecaptcha } from "@/components/ReCaptchaProvider";
import { trackLead } from "@/lib/analytics";

interface Props {
  listingId: string;
  listingAddress: string;
  /** Optional accent: small pill above the form heading. */
  accent?: string;
}

type FormShape = ListingInquiryFormData & { honeypot?: string };

export function ListingInquiryForm({
  listingId,
  listingAddress,
  accent = "Interested?",
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { executeRecaptcha } = useRecaptcha();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormShape>({
    resolver: zodResolver(listingInquiryFormSchema),
    defaultValues: {
      listingId,
      listingAddress,
      message: `I'm interested in ${listingAddress}. Can you tell me more?`,
    },
  });

  async function onSubmit(data: FormShape) {
    setIsSubmitting(true);
    try {
      const recaptchaToken = await executeRecaptcha("listing_inquiry");
      const response = await fetch("/api/listing-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, recaptchaToken }),
      });
      if (!response.ok) throw new Error("Submit failed");

      const json = await response.json().catch(() => null);
      // Real-estate leads land at $2000 EV — same as the main
      // real-estate form. Lets Meta's auction treat them identically.
      trackLead({
        source: "real_estate",
        leadId: json?.leadId ?? null,
        value: 2000,
      });

      toast.success("Thanks — Blake will be in touch within 24 hours.");
      reset({
        listingId,
        listingAddress,
        message: `I'm interested in ${listingAddress}. Can you tell me more?`,
      });
    } catch {
      toast.error("Couldn't send — try again or call (435) 288-9807.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      aria-label="Inquire about this listing"
      className="mt-20 lg:mt-28 pt-12"
      style={{ borderTop: "1px solid var(--hm-rule)" }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-16">
        <div>
          <p
            className="font-mono uppercase mb-3"
            style={{
              fontSize: "var(--hm-text-meta)",
              letterSpacing: "0.18em",
              color: "var(--hm-ink-3)",
            }}
          >
            {accent}
          </p>
          <h2
            className="font-serif font-bold mb-4"
            style={{
              fontSize: "var(--hm-text-h2)",
              color: "var(--hm-ink)",
              letterSpacing: "-0.015em",
            }}
          >
            Ask about this home.
          </h2>
          <p
            className="font-sans"
            style={{
              fontSize: "var(--hm-text-body)",
              color: "var(--hm-ink-2)",
              maxWidth: "40ch",
              lineHeight: 1.6,
            }}
          >
            Send a quick note and we&apos;ll get back within 24 hours.
            For faster service, you can also call{" "}
            <a
              href="tel:+14352889807"
              className="underline hover:text-[var(--hm-accent)]"
            >
              (435) 288-9807
            </a>
            .
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <input type="hidden" {...register("listingId")} />
          <input type="hidden" {...register("listingAddress")} />
          <HoneypotField register={register} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Your name" error={errors.fullName?.message}>
              <input
                {...register("fullName")}
                placeholder="Jane Doe"
                className={inputCls}
                autoComplete="name"
              />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <input
                {...register("phone")}
                placeholder="(555) 123-4567"
                inputMode="tel"
                className={inputCls}
                autoComplete="tel"
              />
            </Field>
          </div>

          <Field label="Email" error={errors.email?.message}>
            <input
              {...register("email")}
              placeholder="you@example.com"
              type="email"
              className={inputCls}
              autoComplete="email"
            />
          </Field>

          <Field label="Message" error={errors.message?.message}>
            <textarea
              {...register("message")}
              rows={4}
              className={inputCls}
            />
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 font-mono uppercase border bg-[var(--hm-ink)] text-[var(--hm-paper)] border-[var(--hm-ink)] hover:bg-[var(--hm-accent)] hover:border-[var(--hm-accent)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              fontSize: "var(--hm-text-meta)",
              letterSpacing: "0.15em",
              padding: "0.875rem 1.5rem",
              minHeight: 44,
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Inquiry
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}

const inputCls =
  "w-full bg-transparent border-0 border-b border-[var(--hm-rule-thick)] focus:border-[var(--hm-ink)] focus:outline-none px-0 py-2.5 text-base font-sans transition-colors placeholder:text-[var(--hm-ink-3)]";

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div>
      <label
        className="block font-mono uppercase mb-1.5"
        style={{
          fontSize: "var(--hm-text-meta)",
          letterSpacing: "0.15em",
          color: "var(--hm-ink-3)",
        }}
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      )}
    </div>
  );
}
