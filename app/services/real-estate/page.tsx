"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import { realEstateFormSchema, RealEstateFormData } from "@/lib/schemas/real-estate";
import { trackLead } from "@/lib/analytics";
import { HoneypotField } from "@/components/ui/HoneypotField";
import { useRecaptcha } from "@/components/ReCaptchaProvider";
import { Navigation } from "@/components/Navigation";
import ListingsStrip from "@/components/real-estate/ListingsStrip";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Bed, Car, Check, Phone, ChevronDown } from "lucide-react";

// Southern Utah cities with zip codes
const SOUTHERN_UTAH_CITIES = [
  { name: "Hurricane", state: "UT", zipCode: "84737" },
  { name: "St. George", state: "UT", zipCode: "84770" },
  { name: "Washington", state: "UT", zipCode: "84780" },
  { name: "Ivins", state: "UT", zipCode: "84738" },
  { name: "Santa Clara", state: "UT", zipCode: "84765" },
  { name: "Leeds", state: "UT", zipCode: "84746" },
  { name: "LaVerkin", state: "UT", zipCode: "84745" },
  { name: "Toquerville", state: "UT", zipCode: "84774" },
  { name: "Virgin", state: "UT", zipCode: "84779" },
  { name: "Hildale", state: "UT", zipCode: "84784" },
  { name: "Enterprise", state: "UT", zipCode: "84725" },
  { name: "Cedar City", state: "UT", zipCode: "84720" },
];

// Extended type for form with honeypot field
type RealEstateFormWithHoneypot = RealEstateFormData & { honeypot?: string };

export default function RealEstatePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactMethod, setContactMethod] = useState<"form" | "call" | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
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
    setValue,
  } = useForm<RealEstateFormWithHoneypot>({
    resolver: zodResolver(realEstateFormSchema),
  });

  const handleCityChange = (cityName: string) => {
    const city = SOUTHERN_UTAH_CITIES.find(c => c.name === cityName);
    if (city) {
      setValue("preferredCity", city.name);
      setValue("preferredState", city.state);
      setValue("preferredZipCode", city.zipCode);
    }
  };

  const howDidYouHearValue = watch("howDidYouHear");

  const onSubmit = async (data: RealEstateFormWithHoneypot) => {
    setIsSubmitting(true);

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await executeRecaptcha('real_estate_form');

      const response = await fetch('/api/real-estate', {
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

      const json = await response.json().catch(() => null);
      trackLead({
        source: 'real_estate',
        leadId: json?.leadId ?? null,
        value: 2000,
      });

      toast.success("Thank you! We'll be in touch within 24 hours to discuss your dream home.");
      reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error("There was an error submitting your form. Please try again or call us directly at (435) 288-9807.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Navigation />

      {/* Marquee fold — editorial display + brokerage colophon. Hero IS the
          page above the fold; no subhead, no CTA in fold. The colophon under
          the rule reads as a publisher's imprint, not a subhead. */}
      <section
        aria-label="Blake Jones Realty"
        className="relative"
        style={{ background: "var(--hm-paper)" }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-36 pb-16 sm:pt-40 sm:pb-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1
              className="font-serif font-bold"
              style={{
                fontSize: "var(--hm-text-display)",
                lineHeight: 0.95,
                color: "var(--hm-ink)",
                letterSpacing: "-0.02em",
                overflowWrap: "anywhere",
                minWidth: 0,
              }}
            >
              Blake Jones<br />Realty.
            </h1>
            <div
              className="mt-10 sm:mt-14 pt-5 border-t flex flex-wrap items-baseline gap-x-6 gap-y-2 font-sans uppercase tracking-[0.18em]"
              style={{
                borderColor: "var(--hm-rule)",
                color: "var(--hm-ink-3)",
                fontSize: "var(--hm-text-meta)",
              }}
            >
              <span>
                Brokered by{" "}
                <span style={{ color: "var(--hm-ink)" }}>Blake Jones</span>
              </span>
              <span aria-hidden="true">·</span>
              <span>KW Ascend, Keller Williams Realty</span>
              <span aria-hidden="true">·</span>
              <span>Southern Utah</span>
            </div>
          </motion.div>
        </div>
        {/* Thick rule marks the transition from marquee to below-fold work */}
        <hr
          className="border-0 mx-6 sm:mx-8 lg:mx-12"
          style={{
            borderTop: "2px solid var(--hm-rule-thick)",
          }}
        />
      </section>

      {/* Listings — the work, sitting directly under the thick rule. The
          ListingsStrip handles its own internal layout; we just wrap it in
          the Linen paper background so the colour band is continuous. */}
      <div style={{ background: "var(--hm-paper)" }}>
        <ListingsStrip />
      </div>

      {/* Editorial prose — replaces the 3-card icon grid AND the black
          "Why Choose Blake Jones Realty" testimonial bar. One single-column,
          measure-controlled passage that names the three differentiators
          inline. No icon cards, no bullets, no centering. */}
      <section
        aria-label="What we do"
        style={{ background: "var(--hm-paper-2)" }}
      >
        <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-24 lg:py-32">
          <h2
            className="font-serif font-bold mb-10"
            style={{
              fontSize: "var(--hm-text-h2)",
              color: "var(--hm-ink)",
              letterSpacing: "-0.015em",
            }}
          >
            What we actually do.
          </h2>
          <div
            className="space-y-6 font-sans"
            style={{
              fontSize: "var(--hm-text-lede)",
              lineHeight: 1.65,
              color: "var(--hm-ink-2)",
              maxWidth: "62ch",
            }}
          >
            <p>
              For buyers moving into Southern Utah, the difference is rarely
              the house. It&apos;s the path to owning it. The right
              neighborhood for the way you want to live. The right inspector
              for a house this old. The right financing path when the
              standard one doesn&apos;t fit your situation. We work that
              path with you, not at you.
            </p>
            <p>
              Three things back that up. A{" "}
              <span style={{ color: "var(--hm-ink)", fontWeight: 500 }}>
                builder&apos;s eye
              </span>
              . Blake came up through construction, so what a property will
              actually take to live in isn&apos;t a guess.{" "}
              <span style={{ color: "var(--hm-ink)", fontWeight: 500 }}>
                Creative financing
              </span>
              . The lenders and structures that open doors when a
              conventional loan can&apos;t. A{" "}
              <span style={{ color: "var(--hm-ink)", fontWeight: 500 }}>
                network you keep
              </span>
              . The inspectors, contractors, lenders, and trades you&apos;ll
              still call two years after closing. The handover isn&apos;t
              the end of the relationship. That&apos;s where it starts.
            </p>
          </div>
        </div>
      </section>

      {/* Process — vertical list, inline numbers as small mono caps. No
          3-column grid, no giant decorative numerals. Numbers are accent
          (terracotta) so the eye reads them as ordinal markers, not as the
          eyebrow-tic the audit flagged. */}
      <section
        aria-label="How a sale goes"
        style={{ background: "var(--hm-paper)" }}
      >
        <div className="max-w-3xl mx-auto px-6 sm:px-8 lg:px-12 py-24 lg:py-32">
          <h2
            className="font-serif font-bold mb-2"
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
            From first call to closing day and beyond. Six checkpoints that
            actually shape a sale.
          </p>
          <ol className="space-y-10">
            {[
              {
                number: "01",
                title: "Initial consultation",
                description:
                  "We talk through goals, budget, timeline, and the must-haves versus the nice-to-haves. That way we're searching for the same house you are.",
              },
              {
                number: "02",
                title: "Pre-approval",
                description:
                  "We connect buyers with trusted lenders and get the pre-approval letter ready. Creative financing options are on the table when conventional doesn't fit.",
              },
              {
                number: "03",
                title: "Home search",
                description:
                  "Personalized MLS alerts, scheduled tours, and the kind of neighborhood context most search sites can't give you. Can't find the right fit? Ask about a custom build.",
              },
              {
                number: "04",
                title: "The offer",
                description:
                  "We prepare and submit a competitive offer on your behalf and negotiate terms to land you the right deal at the right number.",
              },
              {
                number: "05",
                title: "Closing",
                description:
                  "Final walkthrough, title coordination, every document explained. No surprises at the table.",
              },
              {
                number: "06",
                title: "After the keys",
                description:
                  "We don't disappear at closing. Contractor and service referrals, market updates, and the same number you've been calling all along.",
              },
            ].map((step) => (
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

      {/* Contact — editorial heading + left-aligned chip pair. The form
          fields below are unchanged from the previous version (react-hook-form
          wiring + reCAPTCHA + every existing field). */}
      <section
        id="contact-form"
        aria-label="Find your home"
        style={{ background: "var(--hm-paper-2)" }}
      >
        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-24 lg:py-32">
          <div className="mb-12 max-w-3xl">
            <h2
              className="font-serif font-bold mb-4"
              style={{
                fontSize: "var(--hm-text-h2)",
                color: "var(--hm-ink)",
                letterSpacing: "-0.015em",
              }}
            >
              Find your home.
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
              Tell us what you&apos;re looking for and we&apos;ll work the
              search with you. Or skip the form and call. Blake answers his
              own phone.
            </p>

            {/* Contact method chips — left-aligned, outlined. */}
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
                    Direct line
                  </span>
                  <a
                    href="tel:+14352889807"
                    aria-label="Call us at (435) 288-9807"
                    className="block mt-3 font-serif tabular-nums transition-colors"
                    style={{
                      fontSize: "clamp(2.25rem, 5vw, 3.5rem)",
                      color: "var(--hm-ink)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1.05,
                      minHeight: 44,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--hm-accent)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--hm-ink)";
                    }}
                  >
                    (435) 288-9807
                  </a>
                  <a
                    href="mailto:blakerealty@joneslegacycreations.com"
                    aria-label="Email us at blakerealty@joneslegacycreations.com"
                    className="inline-flex items-center mt-4 font-sans transition-colors"
                    style={{
                      fontSize: "var(--hm-text-body)",
                      color: "var(--hm-ink-2)",
                      borderBottom: "1px solid var(--hm-rule)",
                      paddingBottom: "1px",
                      minHeight: 44,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--hm-accent)";
                      e.currentTarget.style.borderColor = "var(--hm-accent)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--hm-ink-2)";
                      e.currentTarget.style.borderColor = "var(--hm-rule)";
                    }}
                  >
                    blakerealty@joneslegacycreations.com
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
                    Time about anything: a listing, a neighborhood, or what
                    your situation can support.
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
              <h3 className="text-2xl font-serif font-bold mb-6">Personal Information</h3>
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
              <h3 className="text-2xl font-serif font-bold mb-6">What Are You Looking For?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Service Type"
                  {...register("serviceType")}
                  error={errors.serviceType?.message}
                  options={[
                    { value: "buying", label: "Buying a Home" },
                    { value: "selling", label: "Selling a Home" },
                    { value: "both", label: "Both Buying & Selling" },
                    { value: "investment", label: "Investment Property" },
                    { value: "rental", label: "Rental Property" },
                  ]}
                  required
                />
                <Select
                  label="Property Type"
                  {...register("propertyType")}
                  error={errors.propertyType?.message}
                  options={[
                    { value: "single-family", label: "Single Family Home" },
                    { value: "condo", label: "Condo/Apartment" },
                    { value: "townhouse", label: "Townhouse" },
                    { value: "multi-family", label: "Multi-Family" },
                    { value: "land", label: "Land/Lot" },
                    { value: "commercial", label: "Commercial Property" },
                  ]}
                  required
                />
              </div>
            </div>

            {/* Location Preferences */}
            <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
              <h3 className="text-2xl font-serif font-bold mb-6">Location Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Preferred City"
                  {...register("preferredCity")}
                  error={errors.preferredCity?.message}
                  options={SOUTHERN_UTAH_CITIES.map(city => ({
                    value: city.name,
                    label: city.name
                  }))}
                  onChange={(e) => handleCityChange(e.target.value)}
                  required
                />
                <Input
                  label="Preferred Neighborhood"
                  {...register("preferredNeighborhood")}
                  error={errors.preferredNeighborhood?.message}
                />
                <Input
                  label="State"
                  {...register("preferredState")}
                  error={errors.preferredState?.message}
                  readOnly
                  disabled
                  className="bg-gray-100"
                  required
                />
                <Input
                  label="Zip Code"
                  {...register("preferredZipCode")}
                  error={errors.preferredZipCode?.message}
                  readOnly
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>

            {/* Budget */}
            <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
              <h3 className="text-2xl font-serif font-bold mb-6">Budget Range</h3>
              <Select
                label="What is your budget range?"
                {...register("budgetRange")}
                error={errors.budgetRange?.message}
                options={[
                  { value: "under-200k", label: "Under $200,000" },
                  { value: "200k-300k", label: "$200,000 - $300,000" },
                  { value: "300k-400k", label: "$300,000 - $400,000" },
                  { value: "400k-500k", label: "$400,000 - $500,000" },
                  { value: "500k-750k", label: "$500,000 - $750,000" },
                  { value: "750k-1m", label: "$750,000 - $1,000,000" },
                  { value: "over-1m", label: "Over $1,000,000" },
                  { value: "flexible", label: "Flexible/Open to Discussion" },
                ]}
                required
              />
            </div>

            {/* Property Size & Layout */}
            <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
              <h3 className="text-2xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Bed aria-hidden="true" className="w-6 h-6" />
                Property Size & Layout
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Bedrooms"
                  {...register("bedrooms")}
                  error={errors.bedrooms?.message}
                  options={[
                    { value: "1", label: "1 Bedroom" },
                    { value: "2", label: "2 Bedrooms" },
                    { value: "3", label: "3 Bedrooms" },
                    { value: "4", label: "4 Bedrooms" },
                    { value: "5+", label: "5+ Bedrooms" },
                  ]}
                  required
                />
                <Select
                  label="Bathrooms"
                  {...register("bathrooms")}
                  error={errors.bathrooms?.message}
                  options={[
                    { value: "1", label: "1 Bathroom" },
                    { value: "1.5", label: "1.5 Bathrooms" },
                    { value: "2", label: "2 Bathrooms" },
                    { value: "2.5", label: "2.5 Bathrooms" },
                    { value: "3", label: "3 Bathrooms" },
                    { value: "3.5+", label: "3.5+ Bathrooms" },
                  ]}
                  required
                />
                <Input
                  label="Square Footage (Min)"
                  type="number"
                  placeholder="e.g., 1500"
                  {...register("squareFootage")}
                  error={errors.squareFootage?.message}
                />
                <Input
                  label="Lot Size (Acres)"
                  type="text"
                  placeholder="e.g., 0.25"
                  {...register("lotSize")}
                  error={errors.lotSize?.message}
                />
                <Input
                  label="Year Built (Preference)"
                  type="text"
                  placeholder="e.g., 2000 or newer"
                  {...register("yearBuilt")}
                  error={errors.yearBuilt?.message}
                />
                <Select
                  label="Stories"
                  {...register("stories")}
                  error={errors.stories?.message}
                  options={[
                    { value: "1", label: "Single Story" },
                    { value: "2", label: "Two Story" },
                    { value: "3+", label: "Three+ Stories" },
                    { value: "split", label: "Split Level" },
                    { value: "any", label: "No Preference" },
                  ]}
                />
              </div>
            </div>

            {/* Garage & Parking */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("garage")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold text-gray-900 flex items-center gap-2">
                  <Car aria-hidden="true" className="w-6 h-6" />
                  Garage & Parking
                </h3>
                <ChevronDown aria-hidden="true" className={`w-6 h-6 transition-transform ${expandedSections.includes("garage") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("garage") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Select
                        label="Garage Spaces"
                        {...register("garageSpaces")}
                        error={errors.garageSpaces?.message}
                        options={[
                          { value: "0", label: "No Garage Needed" },
                          { value: "1", label: "1-Car Garage" },
                          { value: "2", label: "2-Car Garage" },
                          { value: "3", label: "3-Car Garage" },
                          { value: "3+", label: "3+ Car Garage" },
                        ]}
                      />
                      <Select
                        label="Parking Type"
                        {...register("parkingType")}
                        error={errors.parkingType?.message}
                        options={[
                          { value: "attached", label: "Attached Garage" },
                          { value: "detached", label: "Detached Garage" },
                          { value: "carport", label: "Carport" },
                          { value: "driveway", label: "Driveway Only" },
                          { value: "street", label: "Street Parking" },
                          { value: "any", label: "No Preference" },
                        ]}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Architectural Style */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("style")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Architectural Style</h3>
                <ChevronDown aria-hidden="true" className={`w-6 h-6 transition-transform ${expandedSections.includes("style") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("style") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6">
                      <Select
                        label="Preferred Style"
                        {...register("architecturalStyle")}
                        error={errors.architecturalStyle?.message}
                        options={[
                          { value: "modern", label: "Modern" },
                          { value: "contemporary", label: "Contemporary" },
                          { value: "traditional", label: "Traditional" },
                          { value: "colonial", label: "Colonial" },
                          { value: "ranch", label: "Ranch" },
                          { value: "craftsman", label: "Craftsman" },
                          { value: "victorian", label: "Victorian" },
                          { value: "farmhouse", label: "Farmhouse" },
                          { value: "mediterranean", label: "Mediterranean" },
                          { value: "tudor", label: "Tudor" },
                          { value: "any", label: "No Preference" },
                        ]}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Interior Features */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("interior")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Interior Features</h3>
                <ChevronDown aria-hidden="true" className={`w-6 h-6 transition-transform ${expandedSections.includes("interior") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("interior") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Select
                        label="Kitchen Style"
                        {...register("kitchenStyle")}
                        error={errors.kitchenStyle?.message}
                        options={[
                          { value: "modern", label: "Modern/Updated" },
                          { value: "gourmet", label: "Gourmet/Chef's Kitchen" },
                          { value: "open", label: "Open Concept" },
                          { value: "traditional", label: "Traditional" },
                          { value: "any", label: "No Preference" },
                        ]}
                      />
                <Select
                  label="Flooring Preference"
                  {...register("flooringType")}
                  error={errors.flooringType?.message}
                  options={[
                    { value: "hardwood", label: "Hardwood" },
                    { value: "tile", label: "Tile" },
                    { value: "carpet", label: "Carpet" },
                    { value: "laminate", label: "Laminate" },
                    { value: "vinyl", label: "Vinyl" },
                    { value: "mixed", label: "Mixed/Various" },
                    { value: "any", label: "No Preference" },
                  ]}
                />
                <Select
                  label="Basement"
                  {...register("hasBasement")}
                  error={errors.hasBasement?.message}
                  options={[
                    { value: "yes-finished", label: "Yes, Finished" },
                    { value: "yes-unfinished", label: "Yes, Unfinished" },
                    { value: "yes-partial", label: "Yes, Partially Finished" },
                    { value: "no", label: "Not Required" },
                    { value: "any", label: "No Preference" },
                  ]}
                />
                <Select
                  label="Attic"
                  {...register("hasAttic")}
                  error={errors.hasAttic?.message}
                  options={[
                    { value: "yes-finished", label: "Yes, Finished" },
                    { value: "yes-unfinished", label: "Yes, Unfinished" },
                    { value: "no", label: "Not Required" },
                    { value: "any", label: "No Preference" },
                  ]}
                />
                <Select
                  label="Fireplace"
                  {...register("hasFireplace")}
                  error={errors.hasFireplace?.message}
                  options={[
                    { value: "yes-one", label: "Yes, At Least One" },
                    { value: "yes-multiple", label: "Yes, Multiple" },
                    { value: "no", label: "Not Required" },
                    { value: "any", label: "No Preference" },
                  ]}
                />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Exterior Features */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("exterior")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Exterior Features</h3>
                <ChevronDown aria-hidden="true" className={`w-6 h-6 transition-transform ${expandedSections.includes("exterior") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("exterior") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Exterior Material"
                  {...register("exteriorMaterial")}
                  error={errors.exteriorMaterial?.message}
                  options={[
                    { value: "brick", label: "Brick" },
                    { value: "siding", label: "Siding" },
                    { value: "stone", label: "Stone" },
                    { value: "stucco", label: "Stucco" },
                    { value: "wood", label: "Wood" },
                    { value: "mixed", label: "Mixed Materials" },
                    { value: "any", label: "No Preference" },
                  ]}
                />
                <Select
                  label="Roof Type"
                  {...register("roofType")}
                  error={errors.roofType?.message}
                  options={[
                    { value: "asphalt", label: "Asphalt Shingles" },
                    { value: "metal", label: "Metal" },
                    { value: "tile", label: "Tile" },
                    { value: "slate", label: "Slate" },
                    { value: "any", label: "No Preference" },
                  ]}
                />
                <Select
                  label="Swimming Pool"
                  {...register("hasPool")}
                  error={errors.hasPool?.message}
                  options={[
                    { value: "yes-inground", label: "Yes, In-Ground" },
                    { value: "yes-aboveground", label: "Yes, Above-Ground" },
                    { value: "no", label: "Not Required" },
                    { value: "any", label: "No Preference" },
                  ]}
                />
                <Select
                  label="Deck"
                  {...register("hasDeck")}
                  error={errors.hasDeck?.message}
                  options={[
                    { value: "yes", label: "Yes, Required" },
                    { value: "no", label: "Not Required" },
                    { value: "any", label: "No Preference" },
                  ]}
                />
                <Select
                  label="Patio"
                  {...register("hasPatio")}
                  error={errors.hasPatio?.message}
                  options={[
                    { value: "yes", label: "Yes, Required" },
                    { value: "no", label: "Not Required" },
                    { value: "any", label: "No Preference" },
                  ]}
                />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Systems & Utilities */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("systems")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Systems & Utilities</h3>
                <ChevronDown aria-hidden="true" className={`w-6 h-6 transition-transform ${expandedSections.includes("systems") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("systems") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Heating System"
                  {...register("heatingType")}
                  error={errors.heatingType?.message}
                  options={[
                    { value: "forced-air", label: "Forced Air" },
                    { value: "radiant", label: "Radiant" },
                    { value: "baseboard", label: "Baseboard" },
                    { value: "heat-pump", label: "Heat Pump" },
                    { value: "any", label: "No Preference" },
                  ]}
                />
                <Select
                  label="Cooling System"
                  {...register("coolingType")}
                  error={errors.coolingType?.message}
                  options={[
                    { value: "central-ac", label: "Central A/C" },
                    { value: "heat-pump", label: "Heat Pump" },
                    { value: "window-units", label: "Window Units" },
                    { value: "none", label: "Not Required" },
                    { value: "any", label: "No Preference" },
                  ]}
                />
                <Select
                  label="Smart Home Features"
                  {...register("hasSmartHome")}
                  error={errors.hasSmartHome?.message}
                  options={[
                    { value: "yes", label: "Yes, Preferred" },
                    { value: "no", label: "Not Required" },
                    { value: "any", label: "No Preference" },
                  ]}
                />
                <Select
                  label="Solar Panels"
                  {...register("hasSolarPanels")}
                  error={errors.hasSolarPanels?.message}
                  options={[
                    { value: "yes", label: "Yes, Preferred" },
                    { value: "no", label: "Not Required" },
                    { value: "any", label: "No Preference" },
                  ]}
                />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Must-Have Features */}
            <div className="bg-[var(--hm-paper)] border border-[var(--hm-rule)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("requirements")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-[var(--hm-paper-3)] transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Additional Requirements</h3>
                <ChevronDown aria-hidden="true" className={`w-6 h-6 transition-transform ${expandedSections.includes("requirements") ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {expandedSections.includes("requirements") && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 space-y-6">
                <Textarea
                  label="Must-Have Features"
                  placeholder="List any features that are absolutely required (e.g., fenced yard, home office, walk-in closets)"
                  {...register("mustHaveFeatures")}
                  error={errors.mustHaveFeatures?.message}
                  rows={3}
                />
                <Textarea
                  label="Nice-to-Have Features"
                  placeholder="List any features that would be nice but aren't required"
                  {...register("niceToHaveFeatures")}
                  error={errors.niceToHaveFeatures?.message}
                  rows={3}
                />
                <Textarea
                  label="Deal Breakers"
                  placeholder="List any features or conditions that would make you pass on a property"
                  {...register("dealBreakers")}
                  error={errors.dealBreakers?.message}
                  rows={3}
                />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Timeline */}
            <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
              <h3 className="text-2xl font-serif font-bold mb-6">Timeline</h3>
              <Select
                label="When do you want to move?"
                {...register("moveInTimeline")}
                error={errors.moveInTimeline?.message}
                options={[
                  { value: "asap", label: "As Soon As Possible" },
                  { value: "1-3-months", label: "1-3 Months" },
                  { value: "3-6-months", label: "3-6 Months" },
                  { value: "6-12-months", label: "6-12 Months" },
                  { value: "12+-months", label: "12+ Months" },
                  { value: "just-looking", label: "Just Looking/Researching" },
                ]}
                required
              />
            </div>

            {/* Additional Information */}
            <div className="p-6 sm:p-7 bg-[var(--hm-paper)] border border-[var(--hm-rule)]">
              <h3 className="text-2xl font-serif font-bold mb-6">Additional Information</h3>
              <div className="space-y-6">
                <Textarea
                  label="Additional Notes or Questions"
                  placeholder="Is there anything else you'd like us to know about your property search?"
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
                    { value: "social-media", label: "Social Media" },
                    { value: "referral", label: "Referral from Friend/Family" },
                    { value: "realtor", label: "Real Estate Agent" },
                    { value: "advertisement", label: "Advertisement" },
                    { value: "other", label: "Other" },
                  ]}
                  required
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
            </div>

            {/* Submit — left-aligned with a small reply-time note alongside */}
            <div className="pt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button type="submit" size="lg" isLoading={isSubmitting} className="min-w-56">
                Send my search
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

      <Footer />
    </>
  );
}
