"use client";

import { useState, useId } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { contactFormSchema, ContactFormData } from "@/lib/schemas/contact";
import { HoneypotField } from "@/components/ui/HoneypotField";
import { useRecaptcha } from "@/components/ReCaptchaProvider";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";

/* Hallmark · genre: editorial · macrostructure: form-page family
 * design-system: design.md · designed-as-app
 * theme: House · anchor hue: none (monochrome)
 *
 * Form-page pattern from design.md: hairline-divided stacked editorial
 * sections, italic-serif heads, mono-caps eyebrows. Replaces the four
 * card-grid sections (3 department cards + 3 intake cards + 3 office
 * cards + a centered form-in-a-card) with one continuous Linen page. */

type ContactFormWithHoneypot = ContactFormData & { honeypot?: string };

const departments = [
  {
    name: "Real Estate",
    tagline: "Blake Jones — buying, selling, and listing in Southern Utah.",
    phone: "(435) 288-9807",
    phoneHref: "tel:+14352889807",
    email: "blakerealty@joneslegacycreations.com",
    intakeHref: "/services/real-estate#contact-form",
  },
  {
    name: "Construction",
    tagline: "Jones Custom Homes — new builds, renovations, and additions.",
    phone: "(435) 414-8701",
    phoneHref: "tel:+14354148701",
    email: "jch@joneslegacycreations.com",
    intakeHref: "/services/construction#contact-form",
  },
  {
    name: "Interior Design",
    tagline: "Interiors By Jones — design consultations and home staging.",
    phone: "(801) 735-7089",
    phoneHref: "tel:+18017357089",
    email: "interiors@joneslegacycreations.com",
    intakeHref: "/services/interior-design#contact-form",
  },
];

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { executeRecaptcha } = useRecaptcha();
  const formId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormWithHoneypot>({
    resolver: zodResolver(contactFormSchema),
  });

  const onSubmit = async (data: ContactFormWithHoneypot) => {
    setIsSubmitting(true);
    try {
      const recaptchaToken = await executeRecaptcha("contact_form");
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, recaptchaToken }),
      });
      if (!response.ok) throw new Error("Failed to send form");
      toast.success("Thanks. We'll get back to you within 24 hours.");
      reset();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(
        "Couldn't send your message. Try again or email office@joneslegacycreations.com."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />

      <main style={{ background: "var(--hm-paper)", color: "var(--hm-ink)" }}>
        {/* Hero — left-aligned editorial display */}
        <section
          aria-label="Get in touch"
          style={{ background: "var(--hm-paper)" }}
        >
          <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 pt-32 pb-16 lg:pt-40 lg:pb-20">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <p
                className="font-mono uppercase mb-6"
                style={{
                  fontSize: "var(--hm-text-meta)",
                  letterSpacing: "0.22em",
                  color: "var(--hm-ink-3)",
                }}
              >
                Contact · Hurricane, Utah
              </p>
              <h1
                className="font-serif font-bold"
                style={{
                  fontSize: "clamp(3rem, 8vw, 7rem)",
                  lineHeight: 0.96,
                  color: "var(--hm-ink)",
                  letterSpacing: "-0.02em",
                }}
              >
                Get in touch.
              </h1>
              <p
                className="mt-6 font-sans"
                style={{
                  fontSize: "var(--hm-text-lede)",
                  color: "var(--hm-ink-2)",
                  lineHeight: 1.55,
                  maxWidth: "52ch",
                }}
              >
                Three direct lines below for the three sides of the business.
                Or use the general form at the bottom and we&apos;ll route it.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Department contacts — hairline-divided rows instead of three
            equal cards. Each row: mono-caps department, italic tagline,
            phone + email inline + intake link. */}
        <section
          aria-label="Department contacts"
          style={{ background: "var(--hm-paper-2)" }}
        >
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-24">
            <h2
              className="font-serif font-bold mb-3"
              style={{
                fontSize: "var(--hm-text-h2)",
                color: "var(--hm-ink)",
                letterSpacing: "-0.015em",
              }}
            >
              Reach the right desk.
            </h2>
            <p
              className="font-sans mb-12"
              style={{
                fontSize: "var(--hm-text-body)",
                color: "var(--hm-ink-3)",
                maxWidth: "55ch",
              }}
            >
              Each side runs its own phone and email. Whoever picks up
              actually does the work.
            </p>

            <ul
              className="border-t"
              style={{ borderColor: "var(--hm-rule-thick)" }}
            >
              {departments.map((d) => (
                <li
                  key={d.name}
                  className="py-8 sm:py-10"
                  style={{ borderBottom: "1px solid var(--hm-rule)" }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-8 gap-y-3">
                    <p
                      className="font-mono uppercase"
                      style={{
                        fontSize: "var(--hm-text-meta)",
                        letterSpacing: "0.22em",
                        color: "var(--hm-ink-3)",
                      }}
                    >
                      {d.name}
                    </p>
                    <div>
                      <p
                        className="font-serif font-bold mb-4"
                        style={{
                          fontSize: "var(--hm-text-h3)",
                          color: "var(--hm-ink)",
                          lineHeight: 1.3,
                          letterSpacing: "-0.01em",
                          maxWidth: "48ch",
                        }}
                      >
                        {d.tagline}
                      </p>
                      <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 font-sans">
                        <a
                          href={d.phoneHref}
                          className="font-serif tabular-nums transition-colors hover:text-[var(--hm-accent)]"
                          style={{
                            fontSize: "1.5rem",
                            color: "var(--hm-ink)",
                            fontWeight: 500,
                            letterSpacing: "-0.01em",
                          }}
                          aria-label={`Call ${d.name} at ${d.phone}`}
                        >
                          {d.phone}
                        </a>
                        <a
                          href={`mailto:${d.email}`}
                          className="transition-colors hover:text-[var(--hm-accent)]"
                          style={{
                            fontSize: "var(--hm-text-body)",
                            color: "var(--hm-ink-2)",
                            borderBottom: "1px solid var(--hm-rule)",
                            paddingBottom: "1px",
                          }}
                          aria-label={`Email ${d.name} at ${d.email}`}
                        >
                          {d.email}
                        </a>
                        <Link
                          href={d.intakeHref}
                          className="font-mono uppercase transition-colors hover:text-[var(--hm-accent)]"
                          style={{
                            fontSize: "var(--hm-text-meta)",
                            letterSpacing: "0.18em",
                            color: "var(--hm-ink)",
                            borderBottom: "1px solid var(--hm-rule-thick)",
                            paddingBottom: "2px",
                          }}
                        >
                          Intake form →
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* General contact form — no card wrapper, just inline editorial */}
        <section
          aria-label="General message form"
          style={{ background: "var(--hm-paper)" }}
        >
          <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-24">
            <h2
              className="font-serif font-bold mb-3"
              style={{
                fontSize: "var(--hm-text-h2)",
                color: "var(--hm-ink)",
                letterSpacing: "-0.015em",
              }}
            >
              Or send a general message.
            </h2>
            <p
              className="font-sans mb-12"
              style={{
                fontSize: "var(--hm-text-body)",
                color: "var(--hm-ink-3)",
                maxWidth: "55ch",
              }}
            >
              Not sure which department? Use this and we&apos;ll route it.
              Reply within 24 hours.
            </p>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-7"
              noValidate
            >
              <HoneypotField register={register} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full name"
                  id={`${formId}-fullName`}
                  {...register("fullName")}
                  error={errors.fullName?.message}
                  required
                  autoComplete="name"
                />
                <Input
                  label="Email address"
                  type="email"
                  id={`${formId}-email`}
                  inputMode="email"
                  {...register("email")}
                  error={errors.email?.message}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Phone number"
                  type="tel"
                  id={`${formId}-phone`}
                  inputMode="tel"
                  {...register("phone")}
                  error={errors.phone?.message}
                  required
                  autoComplete="tel"
                />
                <Select
                  label="Subject"
                  id={`${formId}-subject`}
                  {...register("subject")}
                  error={errors.subject?.message}
                  options={[
                    { value: "real-estate", label: "Real estate inquiry" },
                    { value: "construction", label: "Construction project" },
                    { value: "interior-design", label: "Interior design / staging" },
                    { value: "partnership", label: "Partnership inquiry" },
                    { value: "general", label: "General question" },
                    { value: "other", label: "Other" },
                  ]}
                  required
                />
              </div>

              <Textarea
                label="Message"
                id={`${formId}-message`}
                placeholder="Tell us what you're thinking about. Be as specific or as broad as you want."
                {...register("message")}
                error={errors.message?.message}
                rows={6}
                required
              />

              <div className="pt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Button
                  type="submit"
                  size="lg"
                  isLoading={isSubmitting}
                  className="min-w-56"
                >
                  Send message
                </Button>
                <span
                  className="font-mono uppercase tracking-[0.18em]"
                  style={{
                    fontSize: "var(--hm-text-meta)",
                    color: "var(--hm-ink-3)",
                  }}
                >
                  Reply within 24 hours
                </span>
              </div>
            </form>
          </div>
        </section>

        {/* Office info — inline mono-caps line, no 3-card grid */}
        <section
          aria-label="Office information"
          style={{ background: "var(--hm-paper-2)" }}
        >
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-16 lg:py-20">
            <div
              className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 pt-10"
              style={{ borderTop: "1px solid var(--hm-rule)" }}
            >
              <OfficeBlock label="General email">
                <a
                  href="mailto:office@joneslegacycreations.com"
                  className="transition-colors hover:text-[var(--hm-accent)]"
                  style={{
                    color: "var(--hm-ink)",
                    borderBottom: "1px solid var(--hm-rule)",
                    paddingBottom: "1px",
                  }}
                >
                  office@joneslegacycreations.com
                </a>
              </OfficeBlock>
              <OfficeBlock label="Location">
                <p
                  className="font-sans"
                  style={{
                    color: "var(--hm-ink)",
                    fontSize: "var(--hm-text-body)",
                    lineHeight: 1.5,
                  }}
                >
                  Hurricane, Utah
                  <br />
                  <span style={{ color: "var(--hm-ink-3)" }}>
                    Serving all of Southern Utah
                  </span>
                </p>
              </OfficeBlock>
              <OfficeBlock label="Hours">
                <p
                  className="font-sans"
                  style={{
                    color: "var(--hm-ink)",
                    fontSize: "var(--hm-text-body)",
                    lineHeight: 1.5,
                  }}
                >
                  Call any reasonable hour.
                  <br />
                  <span style={{ color: "var(--hm-ink-3)" }}>
                    8 am to 8 pm Mountain Time.
                  </span>
                </p>
              </OfficeBlock>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function OfficeBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p
        className="font-mono uppercase mb-3"
        style={{
          fontSize: "10px",
          letterSpacing: "0.22em",
          color: "var(--hm-ink-3)",
        }}
      >
        {label}
      </p>
      <div style={{ fontSize: "var(--hm-text-body)" }}>{children}</div>
    </div>
  );
}
