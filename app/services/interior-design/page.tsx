"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { interiorDesignFormSchema, InteriorDesignFormData } from "@/lib/schemas/interior-design";
import { HoneypotField } from "@/components/ui/HoneypotField";
import { useRecaptcha } from "@/components/ReCaptchaProvider";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Palette, ArrowRight, Instagram, Facebook, Phone } from "lucide-react";

/* Hallmark · genre: editorial · macrostructure: Photographic
 * design-system: design.md · designed-as-app
 * theme: Linen · anchor hue: terracotta
 *
 * The work IS the proof. Hero is a single full-bleed kitchen photo with
 * the display headline overlaid; the editorial sections sit below a
 * thick rule. Replaces the centered-icon hero + gradient-bg + dark
 * benefits bar template. */

// Extended type for form with honeypot field
type InteriorDesignFormWithHoneypot = InteriorDesignFormData & { honeypot?: string };

const S3_BASE_URL = "https://jones-legacy-creations.s3.us-east-1.amazonaws.com/interior/";

interface PortfolioImage {
  filename: string;
  category: string;
  description?: string;
  rotate?: number;
  ext?: string;
}

// Highlighted images for main page (in specific order)
const highlightedImages: PortfolioImage[] = [
  { filename: "kitchen-1", category: "Kitchens", description: "Stunning kitchen transformation" },
  { filename: "living-room-1", category: "Living Rooms", description: "Inviting living room space" },
  { filename: "bedroom-6", category: "Bedrooms", description: "Stylish bedroom interior" },
  { filename: "bathroom-4", category: "Bathrooms", description: "Contemporary bathroom" },
  { filename: "kitchen-6", category: "Kitchens", description: "Elegant kitchen styling" },
  { filename: "living-room-12", category: "Living Rooms", description: "Luxury living room" },
];

type DbShowcase = {
  id: string;
  slug: string;
  title: string;
  location: string | null;
  description: string | null;
  cover_image_url: string | null;
};

export default function InteriorDesignPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactMethod, setContactMethod] = useState<"form" | "call" | null>(null);
  const { executeRecaptcha } = useRecaptcha();

  const [showcases, setShowcases] = useState<DbShowcase[]>([]);
  useEffect(() => {
    fetch("/api/construction-showcases?category=interior_design")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setShowcases(data);
      })
      .catch((err) => console.warn("Failed to load interior design showcases", err));
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InteriorDesignFormWithHoneypot>({
    resolver: zodResolver(interiorDesignFormSchema),
  });

  const onSubmit = async (data: InteriorDesignFormWithHoneypot) => {
    setIsSubmitting(true);

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha('interior_design_form');

      const response = await fetch('/api/interior-design', {
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

      toast.success("Thank you! We'll be in touch within 24 hours to discuss your design project.");
      reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error("There was an error submitting your form. Please try again or call us directly at (801) 735-7089.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const services = [
    {
      eyebrow: "For the home you live in",
      title: "Interior design",
      description:
        "Custom interior work that turns a house into a place that feels like yours. We handle space planning, color, furniture, custom millwork, lighting, and the finish selections that pull the room together.",
      features: [
        "Space planning & layout",
        "Color consultation",
        "Furniture selection",
        "Custom millwork design",
        "Lighting design",
        "Material & finish selection",
      ],
    },
    {
      eyebrow: "For the home you're selling",
      title: "Home staging",
      description:
        "Staging that helps a property sell faster and for more. Vacant or occupied, full home or pre-listing consultation. We pull together what's already there or bring in what's needed.",
      features: [
        "Vacant property staging",
        "Occupied home staging",
        "Pre-listing consultation",
        "Furniture rental",
        "Accessory styling",
        "Curb appeal enhancement",
      ],
    },
  ];

  const process = [
    {
      number: "01",
      title: "Initial consultation",
      description:
        "We walk the rooms together and talk through what you want, what you don't, the budget, the timeline. We take measurements.",
    },
    {
      number: "02",
      title: "Design concept",
      description:
        "Mood boards, color palettes, and preliminary layouts. The shape of the answer before any orders go out.",
    },
    {
      number: "03",
      title: "Design development",
      description:
        "Detailed plans, 3D renderings where they help, and material selections for your sign-off before anything is bought.",
    },
    {
      number: "04",
      title: "Implementation",
      description:
        "We coordinate with contractors and vendors and run the day-to-day so you don't have to chase three different schedules.",
    },
    {
      number: "05",
      title: "Final styling",
      description:
        "Accessories, art, and the styling pass that takes a finished room from done to done well.",
    },
  ];

  return (
    <>
      <Navigation />

      <main style={{ background: "var(--hm-paper)", color: "var(--hm-ink)" }}>
        {/* Photographic hero — full-bleed kitchen photo with mono-caps
            dateline + italic display headline overlaid. No subhead, no
            CTA in fold (per Photographic macro spec). Thick rule marks
            the transition to below-fold content. */}
        <section
          aria-label="Interior design and home staging"
          className="relative"
          style={{ background: "var(--hm-paper)" }}
        >
          <div className="relative w-full" style={{ height: "min(85vh, 800px)", marginTop: "5rem" }}>
            <Image
              src={`${S3_BASE_URL}rolling-rock-drive-kitchen-9.jpeg`}
              alt="Rolling Rock Drive luxury kitchen by Interiors By Jones"
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            {/* Subtle gradient at bottom for text contrast against any image */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.55) 100%)",
              }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 flex flex-col justify-between p-6 sm:p-10 lg:p-14">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="font-mono uppercase"
                style={{
                  fontSize: "var(--hm-text-meta)",
                  letterSpacing: "0.22em",
                  color: "var(--hm-paper)",
                }}
              >
                Interiors By Jones · Hurricane, Utah
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              >
                <h1
                  className="font-serif font-normal italic"
                  style={{
                    fontSize: "clamp(2.75rem, 8vw, 7.5rem)",
                    lineHeight: 0.95,
                    color: "var(--hm-paper)",
                    letterSpacing: "-0.02em",
                    overflowWrap: "anywhere",
                    minWidth: 0,
                  }}
                >
                  Spaces that<br />feel finished.
                </h1>
              </motion.div>
            </div>
          </div>
          <hr
            className="border-0"
            style={{ borderTop: "3px solid var(--hm-rule-thick)" }}
          />
        </section>

        {/* Editorial intro — replaces the centered "Why Choose Us" panel
            and the dark 4-icon benefits bar. Both sets of content folded
            into one editorial paragraph. */}
        <section
          aria-label="Interior design and staging, in plain terms"
          style={{ background: "var(--hm-paper)" }}
        >
          <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-24">
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
                Hilari runs the design side of the business. Interior design
                for the place you live in, staging for the place you want to
                sell. Same eye on both. Most of the work happens in the
                spaces other people would call unusual: tight kitchens,
                awkward layouts, the room you never figured out what to do
                with. That&apos;s the fun part.
              </p>
              <p>
                Sharp eye for potential. Industry-trusted experience. Real
                color and material expertise. Whether you&apos;re elevating
                where you live or staging a home to sell faster and for
                more, we work the same way: walk the rooms, find what they
                want to be, and make the call.
              </p>
            </div>
          </div>
        </section>

        {/* Services — two editorial blocks instead of two icon-circle
            shadow-cards. Mono-caps eyebrow, italic-serif title, prose
            description, hairline-divided feature list. */}
        <section
          aria-label="Services"
          style={{ background: "var(--hm-paper-2)" }}
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-24">
            <h2
              className="font-serif font-normal italic mb-3"
              style={{
                fontSize: "var(--hm-text-h2)",
                color: "var(--hm-ink)",
                letterSpacing: "-0.015em",
              }}
            >
              Two sides of the same job.
            </h2>
            <p
              className="font-sans mb-14"
              style={{
                fontSize: "var(--hm-text-body)",
                color: "var(--hm-ink-3)",
                maxWidth: "55ch",
              }}
            >
              Interior design for the home you live in. Staging for the home
              you&apos;re ready to sell. Same eye on both.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {services.map((service) => (
                <ServiceBlock key={service.title} service={service} />
              ))}
            </div>
          </div>
        </section>

        {/* Process — vertical list, mono-caps inline numbers in terracotta.
            Replaces the 5-col grid with giant grey decorative numerals. */}
        <section
          aria-label="Our process"
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
              How it goes.
            </h2>
            <p
              className="font-sans mb-14"
              style={{
                fontSize: "var(--hm-text-body)",
                color: "var(--hm-ink-3)",
                maxWidth: "55ch",
              }}
            >
              From first walkthrough to the last accessory styled. Five
              checkpoints.
            </p>
            <ol className="space-y-10">
              {process.map((step) => (
                <li key={step.number}>
                  <h3
                    className="font-serif mb-3"
                    style={{
                      fontSize: "var(--hm-text-h3)",
                      color: "var(--hm-ink)",
                      fontWeight: 500,
                    }}
                  >
                    <span
                      className="font-mono uppercase tracking-[0.2em] mr-4 align-baseline"
                      style={{
                        fontSize: "var(--hm-text-meta)",
                        color: "var(--hm-accent)",
                      }}
                    >
                      {step.number}
                    </span>
                    {step.title}
                  </h3>
                  <p
                    className="font-sans"
                    style={{
                      fontSize: "var(--hm-text-body)",
                      lineHeight: 1.65,
                      color: "var(--hm-ink-2)",
                      maxWidth: "62ch",
                    }}
                  >
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Featured Projects (DB-backed) — Linen-styled showcase grid */}
        {showcases.length > 0 && (
          <section
            aria-label="Featured interior design projects"
            style={{ background: "var(--hm-paper-2)" }}
          >
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-24">
              <div className="mb-10 flex items-baseline justify-between flex-wrap gap-4">
                <h2
                  className="font-serif font-normal italic"
                  style={{
                    fontSize: "var(--hm-text-h2)",
                    color: "var(--hm-ink)",
                    letterSpacing: "-0.015em",
                  }}
                >
                  Featured projects.
                </h2>
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: "var(--hm-text-meta)",
                    letterSpacing: "0.18em",
                    color: "var(--hm-ink-3)",
                  }}
                >
                  Recent work
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                {showcases.map((s) => (
                  <ShowcaseCard key={s.id} showcase={s} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Portfolio — six highlighted images. Hairline frame instead of
            shadow-card, mono-caps category eyebrow, italic-serif caption.
            Same 3-col layout but the chrome reads editorial, not SaaS. */}
        <section
          aria-label="Portfolio"
          style={{ background: "var(--hm-paper)" }}
        >
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20 lg:py-24">
            <div className="mb-10 flex items-baseline justify-between flex-wrap gap-4">
              <h2
                className="font-serif font-normal italic"
                style={{
                  fontSize: "var(--hm-text-h2)",
                  color: "var(--hm-ink)",
                  letterSpacing: "-0.015em",
                }}
              >
                The portfolio.
              </h2>
              <Link
                href="/services/interior-design/gallery"
                className="inline-flex items-center font-mono uppercase transition-colors group"
                style={{
                  fontSize: "var(--hm-text-meta)",
                  letterSpacing: "0.18em",
                  color: "var(--hm-ink)",
                  borderBottom: "1px solid var(--hm-rule-thick)",
                  paddingBottom: "2px",
                }}
              >
                View full gallery →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {highlightedImages.map((image) => (
                <PortfolioTile key={image.filename} image={image} />
              ))}
            </div>
          </div>
        </section>

        {/* Form — editorial header + chip toggle */}
        <section
          id="contact-form"
          aria-label="Interior design contact form"
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
                Start the conversation.
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
                Tell us about your space and what you&apos;re hoping to do
                with it. Or skip the form and call. Hilari runs the design
                side of the business and answers her own phone.
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
                    Hilari, direct
                  </span>
                  <a
                    href="tel:+18017357089"
                    aria-label="Call Hilari Jones at (801) 735-7089"
                    className="block mt-3 font-serif tabular-nums transition-colors"
                    style={{
                      fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
                      color: "var(--hm-ink)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1.05,
                      minHeight: 44,
                    }}
                  >
                    (801) 735-7089
                  </a>
                  <a
                    href="mailto:interiors@joneslegacycreations.com"
                    aria-label="Email interiors@joneslegacycreations.com"
                    className="inline-flex items-center mt-4 font-sans transition-colors"
                    style={{
                      fontSize: "var(--hm-text-body)",
                      color: "var(--hm-ink-2)",
                      borderBottom: "1px solid var(--hm-rule)",
                      paddingBottom: "1px",
                      minHeight: 44,
                    }}
                  >
                    interiors@joneslegacycreations.com
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
                    Hilari answers the phone. Call about a design project, a
                    home you&apos;re staging to sell, or to walk through a
                    space you can&apos;t figure out what to do with.
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
                  </div>
                </div>

                {/* Service Type */}
                <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
                  <h3 className="text-2xl font-serif font-normal italic mb-6">Service Needed</h3>
                  <Select
                    label="What service are you interested in?"
                    {...register("serviceType")}
                    error={errors.serviceType?.message}
                    options={[
                      { value: "interior-design", label: "Interior Design" },
                      { value: "home-staging", label: "Home Staging" },
                      { value: "both", label: "Both Interior Design & Staging" },
                      { value: "consultation", label: "Initial Consultation Only" },
                    ]}
                    required
                  />
                </div>

                {/* Property Information */}
                <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
                  <h3 className="text-2xl font-serif font-normal italic mb-6">Property Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <Input
                        label="Property Address (Optional)"
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
                    <Input
                      label="Square Footage"
                      type="number"
                      placeholder="e.g., 2000"
                      {...register("squareFootage")}
                      error={errors.squareFootage?.message}
                    />
                    <Input
                      label="Number of Rooms"
                      type="number"
                      placeholder="e.g., 5"
                      {...register("numberOfRooms")}
                      error={errors.numberOfRooms?.message}
                    />
                  </div>
                </div>

                {/* Project Details */}
                <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
                  <h3 className="text-2xl font-serif font-normal italic mb-6">Project Details</h3>
                  <Textarea
                    label="Project Description"
                    placeholder="Tell us about your project. What are your goals? What spaces need attention?"
                    {...register("projectDescription")}
                    error={errors.projectDescription?.message}
                    rows={5}
                    required
                  />
                </div>

                {/* Budget & Timeline */}
                <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
                  <h3 className="text-2xl font-serif font-normal italic mb-6">Budget & Timeline</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Select
                      label="Estimated Budget"
                      {...register("estimatedBudget")}
                      error={errors.estimatedBudget?.message}
                      options={[
                        { value: "under-5k", label: "Under $5,000" },
                        { value: "5k-10k", label: "$5,000 - $10,000" },
                        { value: "10k-25k", label: "$10,000 - $25,000" },
                        { value: "25k-50k", label: "$25,000 - $50,000" },
                        { value: "50k-100k", label: "$50,000 - $100,000" },
                        { value: "over-100k", label: "Over $100,000" },
                        { value: "unsure", label: "Unsure/Need Estimate" },
                      ]}
                      required
                    />
                    <Select
                      label="Project Timeline"
                      {...register("projectTimeline")}
                      error={errors.projectTimeline?.message}
                      options={[
                        { value: "asap", label: "As Soon As Possible" },
                        { value: "1-3-months", label: "1-3 Months" },
                        { value: "3-6-months", label: "3-6 Months" },
                        { value: "6-12-months", label: "6-12 Months" },
                        { value: "flexible", label: "Flexible" },
                      ]}
                      required
                    />
                  </div>
                </div>

                {/* Style Preferences */}
                <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
                  <h3 className="text-2xl font-serif font-normal italic mb-6">Style Preferences</h3>
                  <div className="space-y-6">
                    <Select
                      label="Preferred Design Style"
                      {...register("stylePreference")}
                      error={errors.stylePreference?.message}
                      options={[
                        { value: "modern", label: "Modern" },
                        { value: "contemporary", label: "Contemporary" },
                        { value: "traditional", label: "Traditional" },
                        { value: "transitional", label: "Transitional" },
                        { value: "farmhouse", label: "Farmhouse/Rustic" },
                        { value: "industrial", label: "Industrial" },
                        { value: "bohemian", label: "Bohemian" },
                        { value: "minimalist", label: "Minimalist" },
                        { value: "eclectic", label: "Eclectic" },
                        { value: "unsure", label: "Not Sure/Need Help Deciding" },
                      ]}
                    />
                    <Textarea
                      label="Color Preferences"
                      placeholder="Tell us about your color preferences or any colors you want to avoid"
                      {...register("colorPreferences")}
                      error={errors.colorPreferences?.message}
                      rows={3}
                    />
                  </div>
                </div>

                {/* Additional Information */}
                <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
                  <h3 className="text-2xl font-serif font-normal italic mb-6">Additional Information</h3>
                  <div className="space-y-6">
                    <Textarea
                      label="Additional Notes"
                      placeholder="Any other details we should know? Special requirements, inspiration, or questions?"
                      {...register("additionalNotes")}
                      error={errors.additionalNotes?.message}
                      rows={4}
                    />
                    <Select
                      label="How did you hear about us?"
                      {...register("howDidYouHear")}
                      error={errors.howDidYouHear?.message}
                      options={[
                        { value: "google", label: "Google Search" },
                        { value: "instagram", label: "Instagram" },
                        { value: "facebook", label: "Facebook" },
                        { value: "referral", label: "Referral from Friend/Family" },
                        { value: "realtor", label: "Real Estate Agent" },
                        { value: "other", label: "Other" },
                      ]}
                    />
                  </div>
                </div>

                {/* Submit — left-aligned with reply-time note */}
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
                    Reply within 24 hours
                  </span>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
          </div>
        </section>

        {/* Social — inline editorial links, no centered icon-island */}
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
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              <a
                href="https://www.instagram.com/interiors.by.jch/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-sans transition-colors hover:text-[var(--hm-accent)]"
                style={{
                  fontSize: "var(--hm-text-lede)",
                  color: "var(--hm-ink)",
                  borderBottom: "1px solid var(--hm-rule-thick)",
                  paddingBottom: "2px",
                }}
                aria-label="Follow Interiors By Jones on Instagram"
              >
                <Instagram aria-hidden="true" className="w-4 h-4" />
                Instagram · @interiors.by.jch
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61575767564467"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-sans transition-colors hover:text-[var(--hm-accent)]"
                style={{
                  fontSize: "var(--hm-text-lede)",
                  color: "var(--hm-ink)",
                  borderBottom: "1px solid var(--hm-rule-thick)",
                  paddingBottom: "2px",
                }}
                aria-label="Follow Interiors By Jones on Facebook"
              >
                <Facebook aria-hidden="true" className="w-4 h-4" />
                Facebook
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

/* Service block — editorial alternative to the icon-circle shadow-card.
 * Mono-caps eyebrow, italic-serif title, prose description, plain hairline
 * feature list. No icons, no checkmarks, no card shadows. */
function ServiceBlock({
  service,
}: {
  service: {
    eyebrow: string;
    title: string;
    description: string;
    features: string[];
  };
}) {
  return (
    <article
      className="p-7 sm:p-9 h-full flex flex-col"
      style={{
        background: "var(--hm-paper)",
        border: "1px solid var(--hm-rule)",
      }}
    >
      <p
        className="font-mono uppercase mb-3"
        style={{
          fontSize: "10px",
          letterSpacing: "0.22em",
          color: "var(--hm-ink-3)",
        }}
      >
        {service.eyebrow}
      </p>
      <h3
        className="font-serif font-normal italic mb-5"
        style={{
          fontSize: "var(--hm-text-h3)",
          color: "var(--hm-ink)",
          letterSpacing: "-0.015em",
          lineHeight: 1.15,
        }}
      >
        {service.title}
      </h3>
      <p
        className="font-sans mb-6"
        style={{
          fontSize: "var(--hm-text-body)",
          color: "var(--hm-ink-2)",
          lineHeight: 1.6,
          maxWidth: "50ch",
        }}
      >
        {service.description}
      </p>
      <ul
        className="space-y-0 mt-auto pt-2"
        style={{ borderTop: "1px solid var(--hm-rule)" }}
      >
        {service.features.map((feature) => (
          <li
            key={feature}
            className="font-sans py-2.5"
            style={{
              fontSize: "var(--hm-text-body)",
              color: "var(--hm-ink-2)",
              borderBottom: "1px solid var(--hm-rule)",
            }}
          >
            {feature}
          </li>
        ))}
      </ul>
    </article>
  );
}

/* Showcase card — same Linen pattern as the construction page's. */
function ShowcaseCard({
  showcase: s,
}: {
  showcase: DbShowcase;
}) {
  return (
    <Link
      href={`/services/interior-design/projects/${s.slug}`}
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
              <Palette
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

/* Portfolio tile — Linen-styled grid card. Hairline frame, no shadow,
 * mono-caps category eyebrow, italic-serif caption. Clicks through to the
 * filtered gallery view. */
function PortfolioTile({ image }: { image: PortfolioImage }) {
  return (
    <Link
      href={`/services/interior-design/gallery?category=${encodeURIComponent(image.category)}`}
      className="group block"
      style={{
        background: "var(--hm-paper)",
        border: "1px solid var(--hm-rule)",
        transition: "border-color var(--hm-dur-short) var(--hm-ease-out)",
      }}
    >
      <article className="flex flex-col h-full">
        <div className="relative aspect-[4/3]" style={{ background: "var(--hm-paper-3)" }}>
          <Image
            src={`${S3_BASE_URL}${image.filename}.${image.ext || "webp"}`}
            alt={image.description || `${image.category} interior design project`}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            loading="lazy"
          />
        </div>
        <div className="p-5 sm:p-6">
          <p
            className="font-mono uppercase mb-2"
            style={{
              fontSize: "10px",
              letterSpacing: "0.22em",
              color: "var(--hm-ink-3)",
            }}
          >
            {image.category}
          </p>
          <p
            className="font-serif italic"
            style={{
              fontSize: "var(--hm-text-body)",
              color: "var(--hm-ink)",
              lineHeight: 1.3,
            }}
          >
            {image.description}
          </p>
        </div>
      </article>
    </Link>
  );
}
