"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Home, MapPin, DollarSign, Bed, Bath, Car, CheckCircle, Phone, ChevronDown } from "lucide-react";

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

const realEstateSchema = z.object({
  // Personal Information
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),

  // Property Type
  propertyType: z.string().min(1, "Please select a property type"),
  serviceType: z.string().min(1, "Please select a service type"),

  // Location Preferences
  preferredCity: z.string().min(1, "Please select a city"),
  preferredNeighborhood: z.string().optional(),
  preferredState: z.string().min(2, "State is required"),
  preferredZipCode: z.string().optional(),

  // Budget
  budgetRange: z.string().min(1, "Please select a budget range"),

  // Property Features
  bedrooms: z.string().min(1, "Please select number of bedrooms"),
  bathrooms: z.string().min(1, "Please select number of bathrooms"),
  squareFootage: z.string().optional(),
  lotSize: z.string().optional(),
  yearBuilt: z.string().optional(),

  // Garage & Parking
  garageSpaces: z.string().optional(),
  parkingType: z.string().optional(),

  // Property Style
  architecturalStyle: z.string().optional(),
  stories: z.string().optional(),

  // Interior Features
  kitchenStyle: z.string().optional(),
  flooringType: z.string().optional(),
  hasBasement: z.string().optional(),
  hasAttic: z.string().optional(),
  hasFireplace: z.string().optional(),

  // Exterior Features
  exteriorMaterial: z.string().optional(),
  roofType: z.string().optional(),
  hasPool: z.string().optional(),
  hasDeck: z.string().optional(),
  hasPatio: z.string().optional(),

  // Systems & Utilities
  heatingType: z.string().optional(),
  coolingType: z.string().optional(),
  hasSmartHome: z.string().optional(),
  hasSolarPanels: z.string().optional(),

  // Additional Features
  mustHaveFeatures: z.string().optional(),
  niceToHaveFeatures: z.string().optional(),
  dealBreakers: z.string().optional(),

  // Timeline
  moveInTimeline: z.string().min(1, "Please select a timeline"),

  // Additional Information
  additionalNotes: z.string().optional(),
  howDidYouHear: z.string().min(1, "Please select how you heard about us"),
  howDidYouHearOther: z.string().optional(),
});

type RealEstateFormData = z.infer<typeof realEstateSchema>;

export default function RealEstatePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactMethod, setContactMethod] = useState<"form" | "call" | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

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
  } = useForm<RealEstateFormData>({
    resolver: zodResolver(realEstateSchema),
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

  const onSubmit = async (data: RealEstateFormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/real-estate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to send form');
      }

      toast.success("Thank you! We'll be in touch within 24 hours to discuss your dream home.");
      reset();
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error("There was an error submitting your form. Please try again or call us directly at (435) 288-9807.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const features = [
    { icon: Home, text: "Expert Property Guidance" },
    { icon: MapPin, text: "Local Market Knowledge" },
    { icon: DollarSign, text: "Competitive Pricing" },
    { icon: CheckCircle, text: "Full-Service Support" },
  ];

  return (
    <>
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-full mb-6">
              <Home className="w-10 h-10" />
            </div>
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">
              Real Estate Services
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Whether you&apos;re buying your dream home or selling your property, we provide expert guidance every step of the way.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {features.map((feature, index) => (
              <motion.div
                key={feature.text}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col items-center text-center p-4"
              >
                <feature.icon className="w-8 h-8 mb-2" />
                <p className="text-sm font-medium">{feature.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Custom Home Sales Section */}
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
              Custom Built Homes
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Own a brand new custom home designed and built to your specifications
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="text-3xl font-serif font-bold mb-6">
                Build Your Dream Home with Jones Legacy Creations
              </h3>
              <p className="text-gray-600 mb-6">
                We specialize in building and selling custom homes throughout Southern Utah. Unlike traditional home buying,
                you'll work directly with our construction team to create a home perfectly tailored to your lifestyle, preferences, and budget.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-black flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold mb-1">Fully Customizable</h4>
                    <p className="text-gray-600 text-sm">Choose layouts, finishes, materials, and features that match your vision</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-black flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold mb-1">Quality Construction</h4>
                    <p className="text-gray-600 text-sm">Built by experienced craftsmen using premium materials and techniques</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-black flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold mb-1">Direct Communication</h4>
                    <p className="text-gray-600 text-sm">Work directly with the builder throughout the entire process</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-black flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold mb-1">Southern Utah Locations</h4>
                    <p className="text-gray-600 text-sm">Prime locations in Hurricane, St. George, Washington, and surrounding areas</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl aspect-[4/3] flex items-center justify-center"
            >
              <Home className="w-24 h-24 text-gray-400" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Financing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 bg-black text-white rounded-full mb-6">
              <DollarSign className="w-10 h-10" />
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Flexible Financing Options
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Make your dream home more affordable with our specialized financing
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="bg-white p-8 rounded-xl text-center"
              >
                <div className="text-5xl font-bold text-gray-300 mb-2">20%</div>
                <h3 className="text-xl font-bold mb-2">Traditional Down Payment</h3>
                <p className="text-gray-600">Most builders require a substantial down payment upfront</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="bg-black text-white p-8 rounded-xl text-center relative overflow-hidden"
              >
                <div className="absolute top-4 right-4">
                  <div className="bg-white text-black text-xs font-bold px-3 py-1 rounded-full">
                    Our Advantage
                  </div>
                </div>
                <div className="text-5xl font-bold mb-2">3-6%</div>
                <h3 className="text-xl font-bold mb-2">Low Down Payment Option</h3>
                <p className="text-gray-300">We work with specialized lenders to offer significantly lower down payments</p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-xl"
            >
              <h3 className="text-2xl font-serif font-bold mb-4 text-center">
                How Our Financing Works
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">Consultation & Pre-Approval</h4>
                    <p className="text-gray-600 text-sm">
                      Meet with our team and get pre-approved through our financing partners
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">Lower Down Payment</h4>
                    <p className="text-gray-600 text-sm">
                      Put down just 3-6% instead of the typical 20% required by most builders
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">Build Your Custom Home</h4>
                    <p className="text-gray-600 text-sm">
                      Work with us to design and build your perfect home
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    4
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">Move Into Your Dream Home</h4>
                    <p className="text-gray-600 text-sm">
                      Close on your home and start enjoying your custom-built space
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-8 p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-600">
                  <strong>Save thousands</strong> in upfront costs while still getting the custom home of your dreams
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
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
              Your Journey to Home Ownership
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From first consultation to moving day, we guide you through every step
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                number: "01",
                title: "Initial Consultation",
                description: "Discuss your vision, budget, and timeline. Get pre-approved for financing.",
              },
              {
                number: "02",
                title: "Design Your Home",
                description: "Work with our team to plan layouts, select finishes, and customize every detail.",
              },
              {
                number: "03",
                title: "Construction",
                description: "Watch your home come to life with regular updates and walkthroughs.",
              },
              {
                number: "04",
                title: "Move In",
                description: "Final walkthrough, close on your home, and move into your custom-built space.",
              },
            ].map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-6xl font-serif font-bold text-gray-200 mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              Ready to Build Your Custom Home?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Take advantage of our low down payment financing and start building today
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#contact-form">
                <Button size="lg" variant="secondary">
                  Get Pre-Approved
                  <DollarSign className="w-5 h-5 ml-2" />
                </Button>
              </a>
            </div>
          </motion.div>
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
              Tell Us About Your Dream Home
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Fill out this form to help us understand exactly what you&apos;re looking for. The more details you provide, the better we can serve you.
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
                  <h3 className="text-2xl font-serif font-bold mb-4">Contact Us Directly</h3>
                  <a
                    href="tel:+14352889807"
                    className="text-4xl font-bold text-black hover:text-gray-700 transition-colors block mb-4"
                  >
                    (435) 288-9807
                  </a>
                  <a
                    href="mailto:blakerealty@joneslegacycreations.com"
                    className="text-xl text-black hover:text-gray-700 transition-colors"
                  >
                    blakerealty@joneslegacycreations.com
                  </a>
                  <p className="text-gray-600 mt-4">
                    We&apos;re available to discuss your real estate needs and answer any questions.
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
            <div className="bg-gray-50 p-6 rounded-xl">
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
            <div className="bg-gray-50 p-6 rounded-xl">
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
            <div className="bg-gray-50 p-6 rounded-xl">
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
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
                <Bed className="w-6 h-6" />
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("garage")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold flex items-center gap-2">
                  <Car className="w-6 h-6" />
                  Garage & Parking
                </h3>
                <ChevronDown className={`w-6 h-6 transition-transform ${expandedSections.includes("garage") ? "rotate-180" : ""}`} />
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("style")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Architectural Style</h3>
                <ChevronDown className={`w-6 h-6 transition-transform ${expandedSections.includes("style") ? "rotate-180" : ""}`} />
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("interior")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Interior Features</h3>
                <ChevronDown className={`w-6 h-6 transition-transform ${expandedSections.includes("interior") ? "rotate-180" : ""}`} />
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("exterior")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Exterior Features</h3>
                <ChevronDown className={`w-6 h-6 transition-transform ${expandedSections.includes("exterior") ? "rotate-180" : ""}`} />
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("systems")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Systems & Utilities</h3>
                <ChevronDown className={`w-6 h-6 transition-transform ${expandedSections.includes("systems") ? "rotate-180" : ""}`} />
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("requirements")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Additional Requirements</h3>
                <ChevronDown className={`w-6 h-6 transition-transform ${expandedSections.includes("requirements") ? "rotate-180" : ""}`} />
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
            <div className="bg-gray-50 p-6 rounded-xl">
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
            <div className="bg-gray-50 p-6 rounded-xl">
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

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <Button type="submit" size="lg" isLoading={isSubmitting} className="min-w-64">
                Submit Property Request
              </Button>
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
