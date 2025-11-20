"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Palette, Home, Sparkles, Eye, Ruler, PaintBucket, ArrowRight, Instagram, Facebook, Phone } from "lucide-react";

const interiorDesignSchema = z.object({
  // Personal Information
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),

  // Service Type
  serviceType: z.string().min(1, "Please select a service type"),

  // Property Information
  propertyAddress: z.string().optional(),
  propertyCity: z.string().min(1, "Please enter a city"),
  propertyState: z.string().min(2, "Please enter a state"),
  propertyZipCode: z.string().optional(),

  // Project Details
  squareFootage: z.string().optional(),
  numberOfRooms: z.string().optional(),
  projectDescription: z.string().min(1, "Please describe your project"),

  // Budget & Timeline
  estimatedBudget: z.string().min(1, "Please select a budget range"),
  projectTimeline: z.string().min(1, "Please select a timeline"),

  // Style Preferences
  stylePreference: z.string().optional(),
  colorPreferences: z.string().optional(),

  // Additional Information
  additionalNotes: z.string().optional(),
  howDidYouHear: z.string().optional(),
});

type InteriorDesignFormData = z.infer<typeof interiorDesignSchema>;

export default function InteriorDesignPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactMethod, setContactMethod] = useState<"form" | "call" | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InteriorDesignFormData>({
    resolver: zodResolver(interiorDesignSchema),
  });

  const onSubmit = async (data: InteriorDesignFormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/interior-design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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
      icon: Palette,
      title: "Interior Design",
      description: "Custom interior design services to transform your space into a reflection of your style and personality.",
      features: [
        "Space Planning & Layout",
        "Color Consultation",
        "Furniture Selection",
        "Custom Millwork Design",
        "Lighting Design",
        "Material & Finish Selection",
      ],
    },
    {
      icon: Home,
      title: "Home Staging",
      description: "Professional home staging to help your property sell faster and for maximum value.",
      features: [
        "Vacant Property Staging",
        "Occupied Home Staging",
        "Pre-Listing Consultation",
        "Furniture Rental",
        "Accessory Styling",
        "Curb Appeal Enhancement",
      ],
    },
  ];

  const process = [
    {
      number: "01",
      title: "Initial Consultation",
      description: "We meet to discuss your vision, needs, budget, and timeline. We'll tour the space and take measurements.",
    },
    {
      number: "02",
      title: "Design Concept",
      description: "We create a comprehensive design concept including mood boards, color palettes, and preliminary layouts.",
    },
    {
      number: "03",
      title: "Design Development",
      description: "We refine the design with detailed plans, 3D renderings, and material selections for your approval.",
    },
    {
      number: "04",
      title: "Implementation",
      description: "We coordinate with contractors and vendors to bring your design to life, managing every detail.",
    },
    {
      number: "05",
      title: "Final Styling",
      description: "We add the finishing touches with accessories, art, and styling to complete your beautiful space.",
    },
  ];

  const portfolioItems = [
    {
      title: "Modern Minimalist Living Room",
      category: "Residential Design",
      description: "Clean lines and neutral tones create a serene, sophisticated space.",
    },
    {
      title: "Luxury Master Suite",
      category: "Residential Design",
      description: "A tranquil retreat featuring custom millwork and premium finishes.",
    },
    {
      title: "Contemporary Kitchen",
      category: "Residential Design",
      description: "Sleek cabinetry and high-end appliances meet functional design.",
    },
    {
      title: "Staged Family Home",
      category: "Home Staging",
      description: "Professional staging helped this property sell 30% above asking.",
    },
    {
      title: "Executive Office Design",
      category: "Commercial Design",
      description: "A professional workspace that balances style with productivity.",
    },
    {
      title: "Vacant Property Transformation",
      category: "Home Staging",
      description: "Strategic staging showcased the potential of this empty space.",
    },
  ];

  const benefits = [
    { icon: Eye, text: "Increase property value and marketability" },
    { icon: Sparkles, text: "Create stunning, functional spaces" },
    { icon: Ruler, text: "Maximize space efficiency" },
    { icon: PaintBucket, text: "Professional color & material expertise" },
  ];

  return (
    <>
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-full mb-6">
              <Palette className="w-10 h-10" />
            </div>
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">
              Interior Design & Home Staging
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12">
              Transform your space with professional interior design and staging services led by our talented designer.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button size="lg">
                  Schedule Consultation
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.text}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mb-4">
                  <benefit.icon className="w-8 h-8" />
                </div>
                <p className="font-medium">{benefit.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Our Services
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive design and staging solutions tailored to your needs
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-2xl shadow-lg"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center flex-shrink-0">
                    <service.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-3xl font-serif font-bold">{service.title}</h3>
                </div>
                <p className="text-gray-600 mb-6">{service.description}</p>
                <ul className="space-y-3">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 bg-black rounded-full mt-2 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Our Process
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From concept to completion, we guide you through every step
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {process.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="text-6xl font-serif font-bold text-gray-200 mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>

                {index < process.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-0.5 bg-gray-200 -z-10" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Featured Projects
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              A glimpse into our recent design and staging successes
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {portfolioItems.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group"
              >
                <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-shadow duration-300">
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Palette className="w-16 h-16 text-gray-400" />
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                  </div>
                  <div className="p-6">
                    <div className="text-sm text-gray-500 mb-2">{item.category}</div>
                    <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                    <p className="text-gray-600 text-sm">{item.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section id="contact-form" className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="text-4xl font-serif font-bold mb-4">
              Start Your Design Journey
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Tell us about your project so we can create the perfect design solution for you.
            </p>

            {/* Contact Method Toggle */}
            <div className="flex items-center justify-center gap-4">
              <Button
                type="button"
                size="lg"
                variant={contactMethod === "form" ? "primary" : "outline"}
                onClick={() => setContactMethod(contactMethod === "form" ? null : "form")}
              >
                Fill Out Our Form
              </Button>
              <span className="text-gray-500 font-medium">or</span>
              <Button
                type="button"
                size="lg"
                variant={contactMethod === "call" ? "primary" : "outline"}
                onClick={() => setContactMethod(contactMethod === "call" ? null : "call")}
              >
                Give Us A Call
              </Button>
            </div>
          </motion.div>

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
                <div className="bg-gray-50 p-12 rounded-xl text-center mb-8">
                  <Phone className="w-16 h-16 mx-auto mb-6 text-gray-700" />
                  <h3 className="text-2xl font-serif font-bold mb-4">Contact Hilari Jones</h3>
                  <a
                    href="tel:+18017357089"
                    className="text-4xl font-bold text-black hover:text-gray-700 transition-colors block mb-4"
                  >
                    (801) 735-7089
                  </a>
                  <a
                    href="mailto:interiors@joneslegacycreations.com"
                    className="text-xl text-black hover:text-gray-700 transition-colors"
                  >
                    interiors@joneslegacycreations.com
                  </a>
                  <p className="text-gray-600 mt-4">
                    We&apos;re available to discuss your interior design and staging needs.
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
                {/* Personal Information */}
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-2xl font-serif font-bold mb-6">Contact Information</h3>
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
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-2xl font-serif font-bold mb-6">Service Needed</h3>
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
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-2xl font-serif font-bold mb-6">Property Information</h3>
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
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-2xl font-serif font-bold mb-6">Project Details</h3>
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
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-2xl font-serif font-bold mb-6">Budget & Timeline</h3>
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
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-2xl font-serif font-bold mb-6">Style Preferences</h3>
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
                <div className="bg-gray-50 p-6 rounded-xl">
                  <h3 className="text-2xl font-serif font-bold mb-6">Additional Information</h3>
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

                {/* Submit Button */}
                <div className="flex justify-center pt-6">
                  <Button type="submit" size="lg" isLoading={isSubmitting} className="min-w-64">
                    Submit Design Request
                  </Button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Social Media Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-serif font-bold mb-6">Follow Us On Social Media</h2>
            <div className="flex items-center justify-center gap-6">
              <a
                href="https://www.instagram.com/interiors.by.jch/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-gray-700 hover:text-black transition-colors"
                title="Follow us on Instagram"
              >
                <Instagram className="w-8 h-8" />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61575767564467"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-gray-700 hover:text-black transition-colors"
                title="Follow us on Facebook"
              >
                <Facebook className="w-8 h-8" />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  );
}
