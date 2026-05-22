"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { constructionFormSchema, ConstructionFormData } from "@/lib/schemas/construction";
import { HoneypotField } from "@/components/ui/HoneypotField";
import { useRecaptcha } from "@/components/ReCaptchaProvider";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Instagram, Phone, ChevronDown, Building2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

/* Hallmark · genre: editorial · macrostructure: Stat-Led
 * design-system: design.md · designed-as-app
 * theme: Linen · anchor hue: terracotta
 *
 * Trust through longevity. Hero anchors on "10+" years; the showcase
 * grids, prose, FAQ, and form sit below. Rotates off Marquee Hero,
 * Bento, and Long Document per design.md's marketing-page family. */

type ConstructionFormWithHoneypot = ConstructionFormData & { honeypot?: string };

const supportingStats = [
  { value: "100+", label: "Homes built" },
  { value: "98%", label: "Client satisfaction" },
  { value: "50+", label: "Trusted trades" },
];

const faqs = [
  {
    question: "Do you handle permits and inspections?",
    answer:
      "Yes. We manage every permit and coordinate inspections all the way through. Full compliance with local building codes and regulations, every project.",
  },
  {
    question: "How long does a typical project take?",
    answer:
      "It depends on scope. A full home build runs 6 to 12 months. Renovations range from a few weeks to several months. We work out a real timeline during planning, not a guess at the start.",
  },
  {
    question: "What areas do you serve?",
    answer:
      "Hurricane, St. George, Washington, Ivins, and the rest of Southern Utah. If you're nearby and not on that list, call and ask.",
  },
  {
    question: "Do you provide warranties on your work?",
    answer:
      "Yes. We stand behind our craftsmanship with comprehensive warranties. Specific terms vary by project type and materials, and are detailed in your contract.",
  },
  {
    question: "Can you work with my architect or designer?",
    answer:
      "Yes. We collaborate with your architect, designer, or engineer to bring your vision to life. If you don't have one, Interiors By Jones can pick up that side of the work too.",
  },
  {
    question: "What payment structure do you use?",
    answer:
      "Progress payments tied to project milestones. We walk through the schedule with you during the initial consultation so there are no surprises.",
  },
  {
    question: "How do you handle changes during construction?",
    answer:
      "Change orders are a normal part of building. We document every change in writing with updated costs and timelines before we proceed. No verbal handshake deals.",
  },
  {
    question: "Are you insured?",
    answer:
      "Yes. Full liability insurance and workers' compensation coverage that protects both our team and your property through the entire build.",
  },
];

export default function ConstructionPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactMethod, setContactMethod] = useState<"form" | "call" | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // DB-backed showcases managed via /admin/showcases. Each card links to
  // its dedicated detail page. Split into Current vs Completed for the two
  // sections on this page.
  type DbShowcase = {
    id: string;
    slug: string;
    title: string;
    location: string | null;
    description: string | null;
    cover_image_url: string | null;
    project_phase: "current" | "completed";
  };
  const [dbShowcases, setDbShowcases] = useState<DbShowcase[]>([]);
  useEffect(() => {
    fetch("/api/construction-showcases?category=construction")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setDbShowcases(data);
      })
      .catch((err) => console.warn("Failed to load showcases", err));
  }, []);
  const currentShowcases = dbShowcases.filter((s) => s.project_phase === "current");
  const completedShowcases = dbShowcases.filter((s) => s.project_phase === "completed");
  const { executeRecaptcha } = useRecaptcha();

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<ConstructionFormWithHoneypot>({
    resolver: zodResolver(constructionFormSchema),
  });

  const howDidYouHearValue = watch("howDidYouHear");

  const onSubmit = async (data: ConstructionFormWithHoneypot) => {
    setIsSubmitting(true);

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha('construction_form');

      const response = await fetch('/api/construction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          recaptchaToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send form');
      }

      toast.success("Thank you! We'll review your project details and contact you within 24-48 hours.");
      reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error("There was an error submitting your form. Please try again or call us directly at (435) 414-8701.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />

      <main style={{ background: "var(--hm-paper)", color: "var(--hm-ink)" }}>
        {/* Stat-Led hero — "10+ years" as the visual anchor. The number
            carries trust. The showcase grids below carry the proof. */}
        <section
          aria-label="Jones Custom Homes"
          style={{ background: "var(--hm-paper)" }}
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-32 pb-20 sm:pt-40 sm:pb-24">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <p
                className="font-mono uppercase mb-8"
                style={{
                  fontSize: "var(--hm-text-meta)",
                  letterSpacing: "0.22em",
                  color: "var(--hm-ink-3)",
                }}
              >
                Building · Southern Utah · since 2014
              </p>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-baseline">
                <div className="lg:col-span-7">
                  <h1
                    className="font-serif font-normal italic tabular-nums"
                    style={{
                      fontSize: "clamp(6rem, 18vw, 14rem)",
                      lineHeight: 0.85,
                      color: "var(--hm-ink)",
                      letterSpacing: "-0.04em",
                    }}
                  >
                    10<span style={{ color: "var(--hm-accent)" }}>+</span>
                  </h1>
                  <p
                    className="mt-6 font-serif italic"
                    style={{
                      fontSize: "var(--hm-text-h3)",
                      color: "var(--hm-ink)",
                      lineHeight: 1.25,
                      maxWidth: "32ch",
                    }}
                  >
                    Years building custom homes in Hurricane and the
                    surrounding county.
                  </p>
                </div>

                <div className="lg:col-span-5 lg:pt-12">
                  <p
                    className="font-sans"
                    style={{
                      fontSize: "var(--hm-text-body)",
                      color: "var(--hm-ink-2)",
                      lineHeight: 1.65,
                      maxWidth: "44ch",
                    }}
                  >
                    Custom homes, additions, renovations, and commercial work.
                    Run by Blake out of Hurricane. Same number you call to
                    quote a build is the number you call when the dishwasher
                    needs an electrician two years later.
                  </p>

                  {/* Supporting stats in tabular row */}
                  <dl
                    className="mt-10 grid grid-cols-3 gap-5"
                    style={{
                      borderTop: "1px solid var(--hm-rule)",
                      paddingTop: "1.5rem",
                    }}
                  >
                    {supportingStats.map((s) => (
                      <div key={s.label}>
                        <dt
                          className="font-serif tabular-nums"
                          style={{
                            fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                            color: "var(--hm-ink)",
                            fontWeight: 500,
                            letterSpacing: "-0.02em",
                            lineHeight: 1,
                          }}
                        >
                          {s.value}
                        </dt>
                        <dd
                          className="font-mono uppercase mt-2"
                          style={{
                            fontSize: "10px",
                            letterSpacing: "0.18em",
                            color: "var(--hm-ink-3)",
                            lineHeight: 1.3,
                          }}
                        >
                          {s.label}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="mt-10 flex flex-wrap gap-3">
                    <Link
                      href="#contact-form"
                      className="inline-flex items-center justify-center font-mono uppercase border bg-[var(--hm-ink)] text-[var(--hm-paper)] border-[var(--hm-ink)] hover:bg-[var(--hm-accent)] hover:border-[var(--hm-accent)] transition-colors duration-200 whitespace-nowrap"
                      style={{
                        fontSize: "var(--hm-text-meta)",
                        letterSpacing: "0.15em",
                        padding: "0.75rem 1.25rem",
                        minHeight: 44,
                      }}
                    >
                      Start a project
                    </Link>
                    <Link
                      href="#projects"
                      className="inline-flex items-center justify-center font-mono uppercase border border-[var(--hm-ink)] text-[var(--hm-ink)] hover:text-[var(--hm-accent)] hover:border-[var(--hm-accent)] transition-colors duration-200 whitespace-nowrap"
                      style={{
                        fontSize: "var(--hm-text-meta)",
                        letterSpacing: "0.15em",
                        padding: "0.75rem 1.25rem",
                        minHeight: 44,
                      }}
                    >
                      See the work ↓
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <hr
            className="border-0 mx-6 sm:mx-8 lg:mx-12"
            style={{ borderTop: "2px solid var(--hm-rule-thick)" }}
          />
        </section>

        {/* Current projects — Linen-styled showcase grid. Hairline-framed
            cards, terracotta "In progress" badge on the cover, italic-serif
            titles. */}
        <section
          id="projects"
          aria-label="Current construction projects"
          style={{ background: "var(--hm-paper)" }}
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-20 pb-16 lg:pt-24">
            <div className="mb-10 flex items-baseline justify-between flex-wrap gap-4">
              <h2
                className="font-serif font-normal italic"
                style={{
                  fontSize: "var(--hm-text-h2)",
                  color: "var(--hm-ink)",
                  letterSpacing: "-0.015em",
                }}
              >
                Currently building.
              </h2>
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: "var(--hm-text-meta)",
                  letterSpacing: "0.18em",
                  color: "var(--hm-ink-3)",
                }}
              >
                In progress
              </span>
            </div>

            {currentShowcases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {currentShowcases.map((s) => (
                  <ShowcaseCard key={s.id} showcase={s} phase="current" />
                ))}
              </div>
            ) : (
              <EmptyShowcaseState message="Nothing actively under construction at the moment. Check back soon, or tell us what you're thinking of building." />
            )}
          </div>
        </section>

        {/* Recent builds — completed showcase grid */}
        <section
          aria-label="Recent construction builds"
          style={{ background: "var(--hm-paper-2)" }}
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 lg:py-20">
            <div className="mb-10 flex items-baseline justify-between flex-wrap gap-4">
              <h2
                className="font-serif font-normal italic"
                style={{
                  fontSize: "var(--hm-text-h2)",
                  color: "var(--hm-ink)",
                  letterSpacing: "-0.015em",
                }}
              >
                Recent builds.
              </h2>
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: "var(--hm-text-meta)",
                  letterSpacing: "0.18em",
                  color: "var(--hm-ink-3)",
                }}
              >
                Completed
              </span>
            </div>

            {completedShowcases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {completedShowcases.map((s) => (
                  <ShowcaseCard key={s.id} showcase={s} phase="completed" />
                ))}
              </div>
            ) : (
              <EmptyShowcaseState message="Recent build photos are on the way. In the meantime, tell us what you're hoping to build." />
            )}
          </div>
        </section>

        {/* Editorial prose — replaces the centered black "Why Choose Us"
            gradient. Trust points named inline. */}
        <section
          aria-label="What we stand on"
          style={{ background: "var(--hm-paper)" }}
        >
          <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-24">
            <h2
              className="font-serif font-normal italic mb-8"
              style={{
                fontSize: "var(--hm-text-h2)",
                color: "var(--hm-ink)",
                letterSpacing: "-0.015em",
              }}
            >
              What we stand on.
            </h2>
            <div
              className="font-sans space-y-6"
              style={{
                fontSize: "var(--hm-text-lede)",
                color: "var(--hm-ink-2)",
                lineHeight: 1.65,
                maxWidth: "62ch",
              }}
            >
              <p>
                We build with patience. A custom home is a one-shot kind of
                project. It deserves the time to get the kitchen right, the
                framing square, and the punch list actually punched. Faster
                isn&apos;t the goal. Right is.
              </p>
              <p>
                We&apos;re licensed, fully insured, and run by Blake out of
                Hurricane. Project management you can read on one page.
                Creative financing options through Blake Jones Realty when
                the standard loan path doesn&apos;t fit. Honest pricing and
                clear schedules, in writing, before the first stake goes in
                the ground.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ — Linen accordion. One question expanded at a time. Numbered
            mono-caps eyebrow inline with the italic question text. Hairline
            divider between rows; no card-shaped chunks. */}
        <section
          aria-label="Frequently asked questions"
          style={{ background: "var(--hm-paper)" }}
        >
          <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-24">
            <h2
              className="font-serif font-normal italic mb-3"
              style={{
                fontSize: "var(--hm-text-h2)",
                color: "var(--hm-ink)",
                letterSpacing: "-0.015em",
              }}
            >
              The questions we get most.
            </h2>
            <p
              className="font-sans mb-12"
              style={{
                fontSize: "var(--hm-text-body)",
                color: "var(--hm-ink-3)",
                maxWidth: "55ch",
              }}
            >
              Eight short answers. Anything else, just call.
            </p>

            <ul
              className="border-t"
              style={{ borderColor: "var(--hm-rule)" }}
            >
              {faqs.map((faq, idx) => {
                const isOpen = openFaq === idx;
                const num = String(idx + 1).padStart(2, "0");
                return (
                  <li
                    key={faq.question}
                    style={{ borderBottom: "1px solid var(--hm-rule)" }}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : idx)}
                      className="w-full flex items-baseline justify-between gap-6 text-left py-6"
                      aria-expanded={isOpen}
                    >
                      <h3
                        className="font-serif"
                        style={{
                          fontSize: "var(--hm-text-h3)",
                          color: "var(--hm-ink)",
                          fontWeight: 500,
                          lineHeight: 1.3,
                        }}
                      >
                        <span
                          className="font-mono uppercase tracking-[0.2em] mr-4 align-baseline"
                          style={{
                            fontSize: "var(--hm-text-meta)",
                            color: "var(--hm-accent)",
                          }}
                        >
                          {num}
                        </span>
                        {faq.question}
                      </h3>
                      <ChevronDown
                        aria-hidden="true"
                        className={`w-5 h-5 transition-transform flex-shrink-0 mt-2 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        style={{ color: "var(--hm-ink-3)" }}
                      />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <p
                            className="font-sans pb-7 pr-10 pl-12"
                            style={{
                              fontSize: "var(--hm-text-body)",
                              color: "var(--hm-ink-2)",
                              lineHeight: 1.65,
                              maxWidth: "62ch",
                            }}
                          >
                            {faq.answer}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Contact — editorial heading + left-aligned chip pair. The form
            fields below are unchanged (react-hook-form wiring + reCAPTCHA +
            every existing field). */}
        <section
          id="contact-form"
          aria-label="Construction project contact form"
          style={{ background: "var(--hm-paper-2)" }}
        >
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-24 lg:py-28">
            <div className="mb-12 max-w-3xl">
              <h2
                className="font-serif font-normal italic mb-4"
                style={{
                  fontSize: "var(--hm-text-h2)",
                  color: "var(--hm-ink)",
                  letterSpacing: "-0.015em",
                }}
              >
                Tell us about your build.
              </h2>
              <p
                className="font-sans"
                style={{
                  fontSize: "var(--hm-text-lede)",
                  lineHeight: 1.6,
                  color: "var(--hm-ink-2)",
                  maxWidth: "62ch",
                }}
              >
                The more you can tell us up front, the more accurate the quote
                and the schedule will be. Or skip the form and call. Blake
                answers his own phone.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-3">
                <span
                  className="font-mono uppercase tracking-[0.18em] mr-2"
                  style={{
                    fontSize: "var(--hm-text-meta)",
                    color: "var(--hm-ink-3)",
                  }}
                >
                  Two ways to start
                </span>
                <button
                  type="button"
                  onClick={() => setContactMethod(contactMethod === "form" ? null : "form")}
                  className="inline-flex items-center justify-center px-5 py-2.5 font-sans font-medium border transition-colors duration-200"
                  style={{
                    fontSize: "var(--hm-text-meta)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    minHeight: 44,
                    whiteSpace: "nowrap",
                    borderColor: contactMethod === "form" ? "var(--hm-ink)" : "var(--hm-rule-thick)",
                    background: contactMethod === "form" ? "var(--hm-ink)" : "transparent",
                    color: contactMethod === "form" ? "var(--hm-paper)" : "var(--hm-ink)",
                  }}
                >
                  Fill out the form
                </button>
                <button
                  type="button"
                  onClick={() => setContactMethod(contactMethod === "call" ? null : "call")}
                  className="inline-flex items-center justify-center px-5 py-2.5 font-sans font-medium border transition-colors duration-200"
                  style={{
                    fontSize: "var(--hm-text-meta)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    minHeight: 44,
                    whiteSpace: "nowrap",
                    borderColor: contactMethod === "call" ? "var(--hm-ink)" : "var(--hm-rule-thick)",
                    background: contactMethod === "call" ? "var(--hm-ink)" : "transparent",
                    color: contactMethod === "call" ? "var(--hm-paper)" : "var(--hm-ink)",
                  }}
                >
                  Give us a call
                </button>
              </div>
            </div>

          <AnimatePresence mode="wait">
            {contactMethod === "call" && (
              <motion.div
                key="call"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div
                  className="p-8 sm:p-10 mb-8"
                  style={{
                    background: "var(--hm-paper)",
                    border: "1px solid var(--hm-rule)",
                    borderLeft: "3px solid var(--hm-accent)",
                  }}
                >
                  <span
                    className="inline-flex items-center gap-2 font-mono uppercase tracking-[0.18em]"
                    style={{
                      fontSize: "var(--hm-text-meta)",
                      color: "var(--hm-ink-3)",
                    }}
                  >
                    <Phone aria-hidden="true" className="w-3.5 h-3.5" />
                    Construction direct
                  </span>
                  <a
                    href="tel:+14354148701"
                    aria-label="Call us at (435) 414-8701"
                    className="block mt-3 font-serif tabular-nums transition-colors"
                    style={{
                      fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
                      color: "var(--hm-ink)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1.05,
                      minHeight: 44,
                    }}
                  >
                    (435) 414-8701
                  </a>
                  <a
                    href="mailto:jch@joneslegacycreations.com"
                    aria-label="Email us at jch@joneslegacycreations.com"
                    className="inline-flex items-center mt-4 font-sans transition-colors"
                    style={{
                      fontSize: "var(--hm-text-body)",
                      color: "var(--hm-ink-2)",
                      borderBottom: "1px solid var(--hm-rule)",
                      paddingBottom: "1px",
                      minHeight: 44,
                    }}
                  >
                    jch@joneslegacycreations.com
                  </a>
                  <p
                    className="mt-6 font-sans"
                    style={{
                      fontSize: "var(--hm-text-body)",
                      color: "var(--hm-ink-2)",
                      lineHeight: 1.6,
                      maxWidth: "55ch",
                    }}
                  >
                    Blake answers the phone. Call between 8am and 8pm Mountain
                    Time about a build, a renovation, a permit question, or
                    just to talk through what you&apos;re considering.
                  </p>
                </div>
              </motion.div>
            )}

            {contactMethod === "form" && (
              <motion.form
                key="form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-8 overflow-hidden"
              >
            {/* Honeypot field - hidden from users, catches bots */}
            <HoneypotField register={register} />

            {/* Personal Information */}
            <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
              <h3 className="text-2xl font-serif font-normal italic mb-6">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  {...register("fullName")}
                  error={errors.fullName?.message}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  {...register("email")}
                  error={errors.email?.message}
                  required
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  {...register("phone")}
                  error={errors.phone?.message}
                  required
                />
                <Input
                  label="Company Name (If Applicable)"
                  {...register("company")}
                  error={errors.company?.message}
                />
              </div>
            </div>

            {/* Project Type */}
            <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
              <h3 className="text-2xl font-serif font-normal italic mb-6">Project Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Project Category"
                  {...register("projectCategory")}
                  error={errors.projectCategory?.message}
                  options={[
                    { value: "residential", label: "Residential" },
                    { value: "commercial", label: "Commercial" },
                    { value: "industrial", label: "Industrial" },
                    { value: "mixed-use", label: "Mixed-Use" },
                  ]}
                  required
                />
                <Select
                  label="Project Type"
                  {...register("projectType")}
                  error={errors.projectType?.message}
                  options={[
                    { value: "new-construction", label: "New Construction" },
                    { value: "renovation", label: "Renovation/Remodel" },
                    { value: "addition", label: "Home Addition" },
                    { value: "restoration", label: "Restoration" },
                    { value: "repair", label: "Repair Work" },
                    { value: "demolition", label: "Demolition" },
                    { value: "custom-build", label: "Custom Build" },
                  ]}
                  required
                />
              </div>
            </div>

            {/* Property Information */}
            <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
              <h3 className="text-2xl font-serif font-normal italic mb-6">Property Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Input
                    label="Property Address"
                    {...register("propertyAddress")}
                    error={errors.propertyAddress?.message}
                    placeholder="Street address"
                  />
                </div>
                <Input
                  label="City"
                  {...register("propertyCity")}
                  error={errors.propertyCity?.message}
                  required
                />
                <Input
                  label="State"
                  {...register("propertyState")}
                  error={errors.propertyState?.message}
                  required
                />
                <Input
                  label="Zip Code"
                  {...register("propertyZipCode")}
                  error={errors.propertyZipCode?.message}
                />
                <Select
                  label="Property Ownership"
                  {...register("propertyOwnership")}
                  error={errors.propertyOwnership?.message}
                  options={[
                    { value: "own", label: "I Own the Property" },
                    { value: "purchasing", label: "Purchasing/In Contract" },
                    { value: "landlord", label: "Landlord/Investor" },
                    { value: "developer", label: "Developer" },
                    { value: "other", label: "Other" },
                  ]}
                  required
                />
              </div>
            </div>

            {/* Project Details */}
            <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
              <h3 className="text-2xl font-serif font-normal italic mb-6">Project Details</h3>
              <div className="space-y-6">
                <Textarea
                  label="Project Scope & Description"
                  placeholder="Please describe your project in detail. What work needs to be done? What are your goals?"
                  {...register("projectScope")}
                  error={errors.projectScope?.message}
                  rows={6}
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Input
                    label="Total Square Footage"
                    type="number"
                    placeholder="e.g., 2500"
                    {...register("squareFootage")}
                    error={errors.squareFootage?.message}
                  />
                  <Input
                    label="Number of Floors"
                    type="number"
                    placeholder="e.g., 2"
                    {...register("numberOfFloors")}
                    error={errors.numberOfFloors?.message}
                  />
                  <Input
                    label="Number of Rooms Affected"
                    type="number"
                    placeholder="e.g., 5"
                    {...register("numberOfRooms")}
                    error={errors.numberOfRooms?.message}
                  />
                </div>
              </div>
            </div>

            {/* Budget & Timeline */}
            <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
              <h3 className="text-2xl font-serif font-normal italic mb-6">Budget & Timeline</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Estimated Budget Range"
                  {...register("estimatedBudget")}
                  error={errors.estimatedBudget?.message}
                  options={[
                    { value: "under-50k", label: "Under $50,000" },
                    { value: "50k-100k", label: "$50,000 - $100,000" },
                    { value: "100k-250k", label: "$100,000 - $250,000" },
                    { value: "250k-500k", label: "$250,000 - $500,000" },
                    { value: "500k-1m", label: "$500,000 - $1,000,000" },
                    { value: "over-1m", label: "Over $1,000,000" },
                    { value: "unsure", label: "Unsure/Need Estimate" },
                  ]}
                  required
                />
                <Select
                  label="Desired Project Timeline"
                  {...register("projectTimeline")}
                  error={errors.projectTimeline?.message}
                  options={[
                    { value: "asap", label: "As Soon As Possible" },
                    { value: "1-3-months", label: "1-3 Months" },
                    { value: "3-6-months", label: "3-6 Months" },
                    { value: "6-12-months", label: "6-12 Months" },
                    { value: "12+-months", label: "12+ Months" },
                    { value: "flexible", label: "Flexible" },
                  ]}
                  required
                />
                <Input
                  label="Preferred Start Date"
                  type="date"
                  {...register("startDate")}
                  error={errors.startDate?.message}
                />
                <Input
                  label="Required Completion Date"
                  type="date"
                  {...register("completionDate")}
                  error={errors.completionDate?.message}
                />
              </div>
            </div>

            {/* Permits & Compliance */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("permits")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-normal italic">Permits & Compliance</h3>
                <ChevronDown aria-hidden="true" className={`w-6 h-6 transition-transform ${expandedSections.includes("permits") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("permits") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Select
                        label="Building Permits"
                        {...register("buildingPermits")}
                        error={errors.buildingPermits?.message}
                        options={[
                          { value: "obtained", label: "Already Obtained" },
                          { value: "need-help", label: "Need Help Obtaining" },
                          { value: "not-sure", label: "Not Sure if Required" },
                          { value: "not-required", label: "Not Required" },
                        ]}
                      />
                      <Select
                        label="Architectural Plans"
                        {...register("architecturalPlans")}
                        error={errors.architecturalPlans?.message}
                        options={[
                          { value: "have-plans", label: "Already Have Plans" },
                          { value: "need-plans", label: "Need Plans Created" },
                          { value: "partial-plans", label: "Have Partial Plans" },
                          { value: "not-sure", label: "Not Sure" },
                        ]}
                      />
                      <Select
                        label="Zoning Compliance"
                        {...register("zoningCompliance")}
                        error={errors.zoningCompliance?.message}
                        options={[
                          { value: "compliant", label: "Confirmed Compliant" },
                          { value: "need-check", label: "Need Verification" },
                          { value: "variance-needed", label: "Variance Needed" },
                          { value: "not-sure", label: "Not Sure" },
                        ]}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Materials & Quality */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("materials")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-normal italic">Materials & Quality Preferences</h3>
                <ChevronDown aria-hidden="true" className={`w-6 h-6 transition-transform ${expandedSections.includes("materials") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("materials") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Select
                        label="Materials Preference"
                        {...register("materialsPreference")}
                        error={errors.materialsPreference?.message}
                        options={[
                          { value: "standard", label: "Standard Quality" },
                          { value: "premium", label: "Premium Quality" },
                          { value: "luxury", label: "Luxury/High-End" },
                          { value: "budget", label: "Budget-Friendly" },
                          { value: "mixed", label: "Mixed (Some Premium)" },
                          { value: "unsure", label: "Need Recommendations" },
                        ]}
                      />
                      <Select
                        label="Overall Quality Level"
                        {...register("qualityLevel")}
                        error={errors.qualityLevel?.message}
                        options={[
                          { value: "economy", label: "Economy" },
                          { value: "standard", label: "Standard" },
                          { value: "premium", label: "Premium" },
                          { value: "luxury", label: "Luxury" },
                          { value: "custom", label: "Custom/Bespoke" },
                        ]}
                      />
                      <Select
                        label="Sustainability Priority"
                        {...register("sustainabilityPreference")}
                        error={errors.sustainabilityPreference?.message}
                        options={[
                          { value: "high-priority", label: "High Priority" },
                          { value: "moderate", label: "Moderate Interest" },
                          { value: "low-priority", label: "Low Priority" },
                          { value: "standard", label: "Standard Practices" },
                        ]}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Specific Work Areas */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("work")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <div>
                  <h3 className="text-2xl font-serif font-normal italic">Specific Work Required</h3>
                  <p className="text-sm text-gray-600 mt-1">Select which areas of work are needed for your project</p>
                </div>
                <ChevronDown className={`w-6 h-6 transition-transform flex-shrink-0 ${expandedSections.includes("work") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("work") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Foundation Work"
                  {...register("foundationWork")}
                  error={errors.foundationWork?.message}
                  options={[
                    { value: "yes-new", label: "Yes - New Foundation" },
                    { value: "yes-repair", label: "Yes - Repair/Reinforcement" },
                    { value: "no", label: "Not Required" },
                  ]}
                />
                <Select
                  label="Framing Work"
                  {...register("framingWork")}
                  error={errors.framingWork?.message}
                  options={[
                    { value: "yes-full", label: "Yes - Full Framing" },
                    { value: "yes-partial", label: "Yes - Partial Framing" },
                    { value: "no", label: "Not Required" },
                  ]}
                />
                <Select
                  label="Roofing Work"
                  {...register("roofingWork")}
                  error={errors.roofingWork?.message}
                  options={[
                    { value: "yes-new", label: "Yes - New Roof" },
                    { value: "yes-repair", label: "Yes - Repair" },
                    { value: "yes-replace", label: "Yes - Replacement" },
                    { value: "no", label: "Not Required" },
                  ]}
                />
                <Select
                  label="Electrical Work"
                  {...register("electricalWork")}
                  error={errors.electricalWork?.message}
                  options={[
                    { value: "yes-full", label: "Yes - Full System" },
                    { value: "yes-partial", label: "Yes - Partial/Updates" },
                    { value: "yes-minor", label: "Yes - Minor Work" },
                    { value: "no", label: "Not Required" },
                  ]}
                />
                <Select
                  label="Plumbing Work"
                  {...register("plumbingWork")}
                  error={errors.plumbingWork?.message}
                  options={[
                    { value: "yes-full", label: "Yes - Full System" },
                    { value: "yes-partial", label: "Yes - Partial/Updates" },
                    { value: "yes-minor", label: "Yes - Minor Work" },
                    { value: "no", label: "Not Required" },
                  ]}
                />
                <Select
                  label="HVAC Work"
                  {...register("hvacWork")}
                  error={errors.hvacWork?.message}
                  options={[
                    { value: "yes-new", label: "Yes - New System" },
                    { value: "yes-replace", label: "Yes - Replacement" },
                    { value: "yes-repair", label: "Yes - Repair/Upgrade" },
                    { value: "no", label: "Not Required" },
                  ]}
                />
                <Select
                  label="Interior Finishing"
                  {...register("interiorFinishing")}
                  error={errors.interiorFinishing?.message}
                  options={[
                    { value: "yes-complete", label: "Yes - Complete Interior" },
                    { value: "yes-select", label: "Yes - Select Rooms" },
                    { value: "yes-updates", label: "Yes - Updates Only" },
                    { value: "no", label: "Not Required" },
                  ]}
                />
                <Select
                  label="Exterior Finishing"
                  {...register("exteriorFinishing")}
                  error={errors.exteriorFinishing?.message}
                  options={[
                    { value: "yes-complete", label: "Yes - Complete Exterior" },
                    { value: "yes-partial", label: "Yes - Partial Work" },
                    { value: "yes-cosmetic", label: "Yes - Cosmetic Only" },
                    { value: "no", label: "Not Required" },
                  ]}
                />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Demolition */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("demolition")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-normal italic">Demolition Requirements</h3>
                <ChevronDown aria-hidden="true" className={`w-6 h-6 transition-transform ${expandedSections.includes("demolition") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("demolition") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Select
                        label="Is Demolition Required?"
                  {...register("demolitionRequired")}
                  error={errors.demolitionRequired?.message}
                  options={[
                    { value: "yes-full", label: "Yes - Full Demolition" },
                    { value: "yes-partial", label: "Yes - Partial Demolition" },
                    { value: "yes-interior", label: "Yes - Interior Only" },
                    { value: "no", label: "No Demolition Needed" },
                  ]}
                />
                      <Textarea
                        label="Demolition Scope (If Applicable)"
                        placeholder="Describe what needs to be demolished"
                        {...register("demolitionScope")}
                        error={errors.demolitionScope?.message}
                        rows={3}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Special Features */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("features")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-normal italic">Special Features & Requirements</h3>
                <ChevronDown aria-hidden="true" className={`w-6 h-6 transition-transform ${expandedSections.includes("features") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("features") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <Select
                  label="Accessibility Features"
                  {...register("accessibilityFeatures")}
                  error={errors.accessibilityFeatures?.message}
                  options={[
                    { value: "yes-ada", label: "Yes - ADA Compliant" },
                    { value: "yes-universal", label: "Yes - Universal Design" },
                    { value: "yes-some", label: "Yes - Some Features" },
                    { value: "no", label: "Not Required" },
                  ]}
                />
                <Select
                  label="Energy Efficiency"
                  {...register("energyEfficiency")}
                  error={errors.energyEfficiency?.message}
                  options={[
                    { value: "high-priority", label: "High Priority" },
                    { value: "moderate", label: "Moderate Priority" },
                    { value: "standard", label: "Standard Efficiency" },
                    { value: "not-priority", label: "Not a Priority" },
                  ]}
                />
                <Select
                  label="Smart Home Integration"
                  {...register("smartHomeIntegration")}
                  error={errors.smartHomeIntegration?.message}
                  options={[
                    { value: "yes-full", label: "Yes - Full Integration" },
                    { value: "yes-basic", label: "Yes - Basic Features" },
                    { value: "yes-some", label: "Yes - Some Systems" },
                    { value: "no", label: "Not Interested" },
                  ]}
                />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Site Conditions */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("site")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-normal italic">Site Conditions</h3>
                <ChevronDown aria-hidden="true" className={`w-6 h-6 transition-transform ${expandedSections.includes("site") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("site") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <Select
                  label="Site Accessibility"
                  {...register("siteAccessibility")}
                  error={errors.siteAccessibility?.message}
                  options={[
                    { value: "easy", label: "Easy Access" },
                    { value: "moderate", label: "Moderate Access" },
                    { value: "difficult", label: "Difficult/Limited" },
                    { value: "not-sure", label: "Not Sure" },
                  ]}
                />
                <Select
                  label="Utility Connections"
                  {...register("utilityConnections")}
                  error={errors.utilityConnections?.message}
                  options={[
                    { value: "connected", label: "All Connected" },
                    { value: "some", label: "Some Connected" },
                    { value: "none", label: "None Connected" },
                    { value: "not-sure", label: "Not Sure" },
                  ]}
                />
                <Select
                  label="Soil/Ground Conditions"
                  {...register("soilConditions")}
                  error={errors.soilConditions?.message}
                  options={[
                    { value: "good", label: "Good Condition" },
                    { value: "unknown", label: "Unknown" },
                    { value: "challenging", label: "Challenging (Rock, Clay, etc.)" },
                    { value: "need-test", label: "Need Soil Testing" },
                  ]}
                />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Additional Services */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("services")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-normal italic">Additional Services Needed</h3>
                <ChevronDown aria-hidden="true" className={`w-6 h-6 transition-transform ${expandedSections.includes("services") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("services") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <Select
                  label="Design Services"
                  {...register("designServices")}
                  error={errors.designServices?.message}
                  options={[
                    { value: "yes-full", label: "Yes - Full Design" },
                    { value: "yes-consultation", label: "Yes - Consultation Only" },
                    { value: "no-have-design", label: "No - Have Design" },
                    { value: "not-sure", label: "Not Sure" },
                  ]}
                />
                <Select
                  label="Engineering Services"
                  {...register("engineeringServices")}
                  error={errors.engineeringServices?.message}
                  options={[
                    { value: "yes-structural", label: "Yes - Structural Engineering" },
                    { value: "yes-other", label: "Yes - Other Engineering" },
                    { value: "no", label: "Not Required" },
                    { value: "not-sure", label: "Not Sure" },
                  ]}
                />
                <Select
                  label="Project Management"
                  {...register("projectManagement")}
                  error={errors.projectManagement?.message}
                  options={[
                    { value: "yes-full", label: "Yes - Full Management" },
                    { value: "yes-partial", label: "Yes - Partial Oversight" },
                    { value: "self-manage", label: "Self-Managing" },
                    { value: "not-sure", label: "Not Sure" },
                  ]}
                />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Insurance & Financing */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("insurance")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-normal italic">Insurance & Financing</h3>
                <ChevronDown aria-hidden="true" className={`w-6 h-6 transition-transform ${expandedSections.includes("insurance") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("insurance") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Select
                        label="Do you have insurance coverage for this project?"
                  {...register("hasInsurance")}
                  error={errors.hasInsurance?.message}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                    { value: "not-sure", label: "Not Sure" },
                  ]}
                />
                <Select
                  label="Will you need financing?"
                  {...register("financingNeeded")}
                  error={errors.financingNeeded?.message}
                  options={[
                    { value: "yes-need-help", label: "Yes - Need Help Arranging" },
                    { value: "yes-have-financing", label: "Yes - Already Arranged" },
                    { value: "no-cash", label: "No - Paying Cash" },
                    { value: "not-sure", label: "Not Sure Yet" },
                  ]}
                />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Additional Information */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("additional")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-normal italic">Additional Information</h3>
                <ChevronDown aria-hidden="true" className={`w-6 h-6 transition-transform ${expandedSections.includes("additional") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("additional") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 space-y-6">
                <Textarea
                  label="Additional Notes, Requirements, or Questions"
                  placeholder="Any other details we should know about your project?"
                  {...register("additionalNotes")}
                  error={errors.additionalNotes?.message}
                  rows={5}
                />
                <Textarea
                  label="Do you have plans, drawings, or photos to share?"
                  placeholder="Please describe what documents you have. You can send them after initial contact."
                  {...register("attachments")}
                  error={errors.attachments?.message}
                  rows={2}
                />
                <Select
                  label="How did you hear about us?"
                  {...register("howDidYouHear")}
                  error={errors.howDidYouHear?.message}
                  options={[
                    { value: "google", label: "Google Search" },
                    { value: "social-media", label: "Social Media" },
                    { value: "referral", label: "Referral" },
                    { value: "previous-client", label: "Previous Client" },
                    { value: "advertisement", label: "Advertisement" },
                    { value: "other", label: "Other" },
                  ]}
                />
                {howDidYouHearValue === "other" && (
                  <AnimatePresence>
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Input
                        label="Please specify"
                        placeholder="Tell us how you heard about us"
                        {...register("howDidYouHearOther")}
                        error={errors.howDidYouHearOther?.message}
                      />
                    </motion.div>
                  </AnimatePresence>
                )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit — left-aligned with a reply-time note */}
            <div className="pt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button type="submit" size="lg" isLoading={isSubmitting} className="min-w-56">
                Send my project
              </Button>
              <span
                className="font-mono uppercase tracking-[0.18em]"
                style={{
                  fontSize: "var(--hm-text-meta)",
                  color: "var(--hm-ink-3)",
                }}
              >
                Reply within 24-48 hours
              </span>
            </div>
              </motion.form>
            )}
          </AnimatePresence>
          </div>
        </section>

        {/* Social — inline line, no centered icon island */}
        <section
          aria-label="Social media"
          style={{ background: "var(--hm-paper)" }}
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12 lg:py-16">
            <p
              className="font-mono uppercase mb-3"
              style={{
                fontSize: "10px",
                letterSpacing: "0.22em",
                color: "var(--hm-ink-3)",
              }}
            >
              Follow along
            </p>
            <a
              href="https://www.instagram.com/jonescustomhomes/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-sans transition-colors"
              style={{
                fontSize: "var(--hm-text-lede)",
                color: "var(--hm-ink)",
                borderBottom: "1px solid var(--hm-rule-thick)",
                paddingBottom: "2px",
              }}
              aria-label="Follow Jones Custom Homes on Instagram"
            >
              <Instagram aria-hidden="true" className="w-4 h-4" />
              Instagram · @jonescustomhomes
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

/* Showcase card — Linen-styled showcase tile. Hairline frame, paper-2
 * fill, italic-serif title, mono-caps location, terracotta "In progress"
 * badge for current builds. */
function ShowcaseCard({
  showcase: s,
  phase,
}: {
  showcase: {
    id: string;
    slug: string;
    title: string;
    location: string | null;
    description: string | null;
    cover_image_url: string | null;
  };
  phase: "current" | "completed";
}) {
  const isCurrent = phase === "current";
  return (
    <Link
      href={`/services/construction/projects/${s.slug}`}
      className="group block"
      style={{
        background: "var(--hm-paper)",
        border: "1px solid var(--hm-rule)",
        transition: "border-color var(--hm-dur-short) var(--hm-ease-out)",
      }}
    >
      <article className="flex flex-col h-full">
        <div
          className="relative w-full aspect-[4/3]"
          style={{ background: "var(--hm-paper-3)" }}
        >
          {s.cover_image_url ? (
            <Image
              src={s.cover_image_url}
              alt={`${s.title}${s.location ? ` in ${s.location}` : ""}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Building2
                aria-hidden="true"
                className="w-10 h-10 mb-3"
                style={{ color: "var(--hm-ink-3)" }}
              />
              <span
                className="font-mono uppercase"
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.22em",
                  color: "var(--hm-ink-3)",
                }}
              >
                Photos coming soon
              </span>
            </div>
          )}
          {isCurrent && (
            <span
              className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 font-mono uppercase tracking-[0.15em]"
              style={{
                fontSize: "10px",
                background: "var(--hm-accent)",
                color: "var(--hm-accent-ink)",
              }}
            >
              In progress
            </span>
          )}
        </div>
        <div className="p-6 sm:p-7 flex flex-col gap-2 flex-1">
          {s.location && (
            <p
              className="font-mono uppercase"
              style={{
                fontSize: "10px",
                letterSpacing: "0.22em",
                color: "var(--hm-ink-3)",
              }}
            >
              {s.location}
            </p>
          )}
          <h3
            className="font-serif italic"
            style={{
              fontSize: "var(--hm-text-h3)",
              color: "var(--hm-ink)",
              fontWeight: 500,
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {s.title}
          </h3>
          {s.description && (
            <p
              className="font-sans line-clamp-2 mt-1"
              style={{
                fontSize: "var(--hm-text-body)",
                color: "var(--hm-ink-2)",
                lineHeight: 1.55,
              }}
            >
              {s.description}
            </p>
          )}
          <span
            className="font-mono uppercase mt-3 transition-colors group-hover:text-[var(--hm-accent)]"
            style={{
              fontSize: "var(--hm-text-meta)",
              letterSpacing: "0.15em",
              color: "var(--hm-ink)",
            }}
          >
            View project →
          </span>
        </div>
      </article>
    </Link>
  );
}

function EmptyShowcaseState({ message }: { message: string }) {
  return (
    <div
      className="px-8 py-16"
      style={{
        background: "var(--hm-paper-2)",
        borderTop: "1px solid var(--hm-rule)",
        borderBottom: "1px solid var(--hm-rule)",
      }}
    >
      <Building2
        aria-hidden="true"
        className="h-7 w-7"
        style={{ color: "var(--hm-ink-3)" }}
      />
      <p
        className="mt-5 font-serif italic"
        style={{
          fontSize: "var(--hm-text-h3)",
          color: "var(--hm-ink)",
          lineHeight: 1.3,
        }}
      >
        {message}
      </p>
    </div>
  );
}
