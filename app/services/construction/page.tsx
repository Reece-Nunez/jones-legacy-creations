"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
import { Building2, Hammer, ClipboardCheck, Award, Shield, Clock } from "lucide-react";

const constructionSchema = z.object({
  // Personal Information
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  company: z.string().optional(),

  // Project Type
  projectType: z.string().min(1, "Please select a project type"),
  projectCategory: z.string().min(1, "Please select a project category"),

  // Property Information
  propertyAddress: z.string().optional(),
  propertyCity: z.string().min(1, "Please enter a city"),
  propertyState: z.string().min(2, "Please enter a state"),
  propertyZipCode: z.string().optional(),
  propertyOwnership: z.string().min(1, "Please select property ownership status"),

  // Project Details
  projectScope: z.string().min(1, "Please describe your project"),
  squareFootage: z.string().optional(),
  numberOfFloors: z.string().optional(),
  numberOfRooms: z.string().optional(),

  // Budget & Timeline
  estimatedBudget: z.string().min(1, "Please select a budget range"),
  projectTimeline: z.string().min(1, "Please select a timeline"),
  startDate: z.string().optional(),
  completionDate: z.string().optional(),

  // Specific Requirements
  buildingPermits: z.string().optional(),
  architecturalPlans: z.string().optional(),
  zoningCompliance: z.string().optional(),

  // Materials & Finishes
  materialsPreference: z.string().optional(),
  qualityLevel: z.string().optional(),
  sustainabilityPreference: z.string().optional(),

  // Specific Work Areas
  foundationWork: z.string().optional(),
  framingWork: z.string().optional(),
  roofingWork: z.string().optional(),
  electricalWork: z.string().optional(),
  plumbingWork: z.string().optional(),
  hvacWork: z.string().optional(),
  interiorFinishing: z.string().optional(),
  exteriorFinishing: z.string().optional(),

  // Demolition
  demolitionRequired: z.string().optional(),
  demolitionScope: z.string().optional(),

  // Accessibility & Special Features
  accessibilityFeatures: z.string().optional(),
  energyEfficiency: z.string().optional(),
  smartHomeIntegration: z.string().optional(),

  // Site Conditions
  siteAccessibility: z.string().optional(),
  utilityConnections: z.string().optional(),
  soilConditions: z.string().optional(),

  // Additional Services
  designServices: z.string().optional(),
  engineeringServices: z.string().optional(),
  projectManagement: z.string().optional(),

  // Insurance & Financing
  hasInsurance: z.string().optional(),
  financingNeeded: z.string().optional(),

  // Additional Information
  additionalNotes: z.string().optional(),
  howDidYouHear: z.string().optional(),
  attachments: z.string().optional(),
});

type ConstructionFormData = z.infer<typeof constructionSchema>;

export default function ConstructionPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ConstructionFormData>({
    resolver: zodResolver(constructionSchema),
  });

  const onSubmit = async (data: ConstructionFormData) => {
    setIsSubmitting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("Form Data:", data);
    toast.success("Thank you! We'll review your project details and contact you within 24-48 hours.");
    reset();
    setIsSubmitting(false);
  };

  const features = [
    { icon: Hammer, text: "Expert Craftsmanship" },
    { icon: ClipboardCheck, text: "Full Project Management" },
    { icon: Award, text: "Quality Guaranteed" },
    { icon: Shield, text: "Licensed & Insured" },
    { icon: Clock, text: "On-Time Delivery" },
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
              <Building2 className="w-10 h-10" />
            </div>
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">
              Construction Services
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From new builds to renovations, we deliver exceptional construction projects with precision and care.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-6 max-w-4xl mx-auto">
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

      {/* Form Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <h2 className="text-4xl font-serif font-bold mb-4">
              Tell Us About Your Construction Project
            </h2>
            <p className="text-lg text-gray-600">
              Provide detailed information about your project so we can give you an accurate quote and timeline.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-8"
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
                <Input
                  label="Company Name (If Applicable)"
                  {...register("company")}
                  error={errors.company?.message}
                />
              </div>
            </div>

            {/* Project Type */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-2xl font-serif font-bold mb-6">Project Type</h3>
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
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-2xl font-serif font-bold mb-6">Property Information</h3>
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
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-2xl font-serif font-bold mb-6">Project Details</h3>
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
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-2xl font-serif font-bold mb-6">Budget & Timeline</h3>
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
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-2xl font-serif font-bold mb-6">Permits & Compliance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </div>

            {/* Materials & Quality */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-2xl font-serif font-bold mb-6">Materials & Quality Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </div>

            {/* Specific Work Areas */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-2xl font-serif font-bold mb-6">Specific Work Required</h3>
              <p className="text-sm text-gray-600 mb-4">Select which areas of work are needed for your project</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            {/* Demolition */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-2xl font-serif font-bold mb-6">Demolition Requirements</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            {/* Special Features */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-2xl font-serif font-bold mb-6">Special Features & Requirements</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </div>

            {/* Site Conditions */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-2xl font-serif font-bold mb-6">Site Conditions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </div>

            {/* Additional Services */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-2xl font-serif font-bold mb-6">Additional Services Needed</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            </div>

            {/* Insurance & Financing */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-2xl font-serif font-bold mb-6">Insurance & Financing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            </div>

            {/* Additional Information */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <h3 className="text-2xl font-serif font-bold mb-6">Additional Information</h3>
              <div className="space-y-6">
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
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <Button type="submit" size="lg" isLoading={isSubmitting} className="min-w-64">
                Submit Project Request
              </Button>
            </div>
          </motion.form>
        </div>
      </section>

      <Footer />
    </>
  );
}
