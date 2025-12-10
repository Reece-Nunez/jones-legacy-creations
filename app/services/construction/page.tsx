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
import { Hammer, ClipboardCheck, Award, Shield, Clock, Instagram, Phone, ChevronDown, CheckCircle, Building2, X, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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
  howDidYouHearOther: z.string().optional(),
  attachments: z.string().optional(),
});

type ConstructionFormData = z.infer<typeof constructionSchema>;

// S3 base URL for construction images
const S3_BASE_URL = "https://jones-legacy-creations.s3.us-east-1.amazonaws.com/construction";

// Helper function to generate image URLs automatically
// Images must be named: image1.webp, image2.webp, image3.webp, etc.
function generateImages(folder: string, imageCount: number, title: string) {
  return Array.from({ length: imageCount }, (_, i) => ({
    src: `${S3_BASE_URL}/${folder}/image${i + 1}.webp`,
    alt: `${title} - Image ${i + 1}`,
  }));
}

interface CompletedProject {
  id: string;
  title: string;
  location: string;
  description: string;
  folder: string;
  imageCount: number;
  coverImageNum?: number;
  features?: string[];
  // Generated fields
  coverImage?: string;
  images?: { src: string; alt: string }[];
}

// ============================================================
// TO ADD MORE IMAGES: Just update imageCount below
// Images must be named image1.webp, image2.webp, etc in the S3 folder
// ============================================================
const completedBuildsData: CompletedProject[] = [
  {
    id: "haven-hideaway",
    title: "Haven Hideaway",
    location: "Hatch, UT",
    description: "The Haven Hideaway is a warm, custom-built retreat tucked into the quiet mountain town of Hatch. Designed to take in stunning views in every direction, this cabin features exposed wood, big windows, and a cozy, modern–rustic feel. Built with quality craftsmanship, the layout is simple, inviting, and perfect for relaxing weekends or year-round escape.",
    folder: "haven-hideaway",
    imageCount: 42, // Update when images are uploaded
    coverImageNum: 42, // Which image number to use as the cover
    features: ["Exposed Wood", "Large Windows", "Mountain Views", "Modern-Rustic Design"],
  },
  {
    id: "peach-grove",
    title: "Peach Grove Home",
    location: "Hurricane, UT",
    description: "This family-friendly home feels warm and welcoming from the moment you walk in. Enjoy a large yard with room to play and relax under the peach trees, then head inside to cozy up by the fire. The layout is comfortable and practical, with an oversized master vanity and inviting spaces designed for everyday living. It's a home made for real families and real moments.",
    folder: "peach-grove",
    imageCount: 24, // <-- Just change this number when you add more images
    coverImageNum: 21, // Which image number to use as the cover
    features: ["Large Yard", "Oversized Master Vanity", "Family-Friendly Layout"],
  },
];

// Auto-generate image URLs from the data above
const completedBuilds = completedBuildsData.map(project => ({
  ...project,
  coverImage: project.imageCount > 0
    ? `${S3_BASE_URL}/${project.folder}/image${project.coverImageNum || 1}.webp`
    : "",
  images: generateImages(project.folder, project.imageCount, project.title),
}));

// Current projects
const currentProjects = [
  {
    id: "hurricane-current",
    title: "New Custom Build",
    location: "Hurricane, UT",
    status: "Coming Soon",
  },
];

export default function ConstructionPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactMethod, setContactMethod] = useState<"form" | "call" | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<CompletedProject | null>(null);
  const [lightboxImageIndex, setLightboxImageIndex] = useState<number | null>(null);

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
  } = useForm<ConstructionFormData>({
    resolver: zodResolver(constructionSchema),
  });

  const howDidYouHearValue = watch("howDidYouHear");

  const onSubmit = async (data: ConstructionFormData) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/construction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
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
            <div className="inline-flex items-center justify-center w-28 h-28 mb-6">
              <Image
                src="/JONES CUSTOM HOMES ICON (2).svg"
                alt="Jones Custom Homes"
                width={120}
                height={120}
                className="object-contain"
              />
            </div>
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">
              Construction Services
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From new builds to renovations, we deliver exceptional construction projects with precision and care.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6 max-w-4xl mx-auto">
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

      {/* Current Projects Section */}
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
              Current Project
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              See what we&apos;re building right now
            </p>
          </motion.div>

          <div className="max-w-md mx-auto">
            {currentProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-50 rounded-xl overflow-hidden"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 relative">
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Building2 className="w-16 h-16 text-gray-400 mb-4" />
                    <span className="text-2xl font-serif font-bold text-gray-500">Photos Coming Soon</span>
                  </div>
                </div>
                <div className="p-6 text-center">
                  <div className="text-sm text-gray-500 mb-2">{project.location}</div>
                  <h3 className="text-xl font-bold mb-3">{project.title}</h3>
                  <div className="inline-block px-4 py-2 bg-black text-white text-sm font-medium rounded-full">
                    {project.status}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Most Recent Builds Section */}
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
              Most Recent Builds
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Quality craftsmanship delivered with care and attention to detail
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {completedBuilds.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02]">
                  <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 relative overflow-hidden">
                    {project.coverImage ? (
                      <Image
                        src={project.coverImage}
                        alt={project.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Building2 className="w-16 h-16 text-gray-400 mb-2" />
                        <span className="text-sm text-gray-500">Photos Coming Soon</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
                    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      View Details
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="text-sm text-gray-500 mb-2">{project.location}</div>
                    <h3 className="text-2xl font-serif font-bold mb-2">{project.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2">{project.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Project Detail Modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedProject(null)}
                className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Cover Image */}
              <div className="aspect-[16/9] bg-gradient-to-br from-gray-200 to-gray-300 relative">
                {selectedProject.coverImage ? (
                  <Image
                    src={selectedProject.coverImage}
                    alt={selectedProject.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Building2 className="w-20 h-20 text-gray-400 mb-4" />
                    <span className="text-xl text-gray-500">Photos Coming Soon</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-8">
                <div className="text-sm text-gray-500 mb-2">{selectedProject.location}</div>
                <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">{selectedProject.title}</h2>
                <p className="text-lg text-gray-600 mb-6 leading-relaxed">{selectedProject.description}</p>

                {/* Features */}
                {selectedProject.features && selectedProject.features.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold mb-3">Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.features.map((feature) => (
                        <span
                          key={feature}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-full"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image Gallery */}
                {selectedProject.images.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold mb-4">Gallery</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedProject.images.map((image, index) => (
                        <div
                          key={index}
                          className="aspect-[4/3] relative rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setLightboxImageIndex(index)}
                        >
                          <Image
                            src={image.src}
                            alt={image.alt}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interest CTA */}
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                  <h3 className="text-xl font-serif font-bold mb-2">Interested in a Similar Build?</h3>
                  <p className="text-gray-600 mb-4">
                    Love this layout? Let us know and we can discuss how to customize it for your needs.
                  </p>
                  <Link href="#contact-form" onClick={() => setSelectedProject(null)}>
                    <Button size="lg">
                      Request This Layout
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedProject && lightboxImageIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4"
            onClick={() => setLightboxImageIndex(null)}
          >
            <button
              onClick={() => setLightboxImageIndex(null)}
              className="absolute top-4 right-4 z-50 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              aria-label="Close lightbox"
            >
              <X className="w-6 h-6 text-white" />
            </button>

            {lightboxImageIndex > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxImageIndex(lightboxImageIndex - 1);
                }}
                className="absolute left-4 z-50 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
            )}

            {lightboxImageIndex < selectedProject.images.length - 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxImageIndex(lightboxImageIndex + 1);
                }}
                className="absolute right-4 z-50 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            )}

            <div
              className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-full">
                <Image
                  src={selectedProject.images[lightboxImageIndex].src}
                  alt={selectedProject.images[lightboxImageIndex].alt}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-white text-sm">
                  {lightboxImageIndex + 1} / {selectedProject.images.length}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Why Choose Us Section */}
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
              Why Choose Jones Legacy Creations
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Building excellence through experience, quality, and dedication
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Licensed & Insured",
                description: "Fully licensed, bonded, and insured for your protection and peace of mind.",
              },
              {
                icon: Award,
                title: "Quality Craftsmanship",
                description: "Meticulous attention to detail and commitment to excellence in every project.",
              },
              {
                icon: Clock,
                title: "On-Time Delivery",
                description: "We respect your time and consistently complete projects on schedule.",
              },
              {
                icon: ClipboardCheck,
                title: "Project Management",
                description: "Full coordination of all trades and suppliers for seamless execution.",
              },
              {
                icon: Hammer,
                title: "Experienced Team",
                description: "Skilled craftsmen with years of experience in residential and commercial construction.",
              },
              {
                icon: CheckCircle,
                title: "Customer Satisfaction",
                description: "Your vision is our priority. We work closely with you every step of the way.",
              },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-black text-white rounded-full mb-4">
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Common questions about our construction services
            </p>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                question: "Do you handle permits and inspections?",
                answer: "Yes, we manage all necessary permits and coordinate inspections throughout the construction process. We ensure full compliance with local building codes and regulations.",
              },
              {
                question: "How long does a typical construction project take?",
                answer: "Timeline varies based on project scope. A complete home build typically takes 6-12 months, while renovations can range from a few weeks to several months. We provide detailed timelines during the planning phase.",
              },
              {
                question: "What areas do you serve?",
                answer: "We primarily serve Hurricane, St. George, Washington, Ivins, and the surrounding Southern Utah area. Contact us to confirm service availability for your location.",
              },
              {
                question: "Do you provide warranties on your work?",
                answer: "Yes, we stand behind our craftsmanship with comprehensive warranties. Specific warranty terms vary by project type and materials used, and are detailed in your contract.",
              },
              {
                question: "Can you work with my architect or designer?",
                answer: "Absolutely! We're happy to collaborate with your architect, designer, or engineer to bring your vision to life. We can also provide design services if needed.",
              },
              {
                question: "What payment structure do you use?",
                answer: "We typically work on a progress payment schedule, with payments tied to project milestones. We'll discuss payment terms in detail during our initial consultation.",
              },
              {
                question: "How do you handle changes during construction?",
                answer: "Change orders are a normal part of construction. We document all changes in writing with updated costs and timelines before proceeding to ensure transparency.",
              },
              {
                question: "Are you insured?",
                answer: "Yes, we maintain full liability insurance and workers' compensation coverage to protect both our team and your property throughout the construction process.",
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-xl"
              >
                <h3 className="text-lg font-bold mb-3">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
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
              Tell Us About Your Construction Project
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              Provide detailed information about your project so we can give you an accurate quote and timeline.
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
                    href="tel:+14354148701"
                    className="text-4xl font-bold text-black hover:text-gray-700 transition-colors block mb-4"
                  >
                    (435) 414-8701
                  </a>
                  <a
                    href="mailto:jch@joneslegacycreations.com"
                    className="text-xl text-black hover:text-gray-700 transition-colors"
                  >
                    jch@joneslegacycreations.com
                  </a>
                  <p className="text-gray-600 mt-4">
                    We&apos;re available to discuss your project and answer any questions.
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("permits")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Permits & Compliance</h3>
                <ChevronDown className={`w-6 h-6 transition-transform ${expandedSections.includes("permits") ? "rotate-180" : ""}`} />
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("materials")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Materials & Quality Preferences</h3>
                <ChevronDown className={`w-6 h-6 transition-transform ${expandedSections.includes("materials") ? "rotate-180" : ""}`} />
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("work")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <div>
                  <h3 className="text-2xl font-serif font-bold">Specific Work Required</h3>
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("demolition")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Demolition Requirements</h3>
                <ChevronDown className={`w-6 h-6 transition-transform ${expandedSections.includes("demolition") ? "rotate-180" : ""}`} />
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("features")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Special Features & Requirements</h3>
                <ChevronDown className={`w-6 h-6 transition-transform ${expandedSections.includes("features") ? "rotate-180" : ""}`} />
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("site")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Site Conditions</h3>
                <ChevronDown className={`w-6 h-6 transition-transform ${expandedSections.includes("site") ? "rotate-180" : ""}`} />
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("services")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Additional Services Needed</h3>
                <ChevronDown className={`w-6 h-6 transition-transform ${expandedSections.includes("services") ? "rotate-180" : ""}`} />
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("insurance")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Insurance & Financing</h3>
                <ChevronDown className={`w-6 h-6 transition-transform ${expandedSections.includes("insurance") ? "rotate-180" : ""}`} />
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
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("additional")}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <h3 className="text-2xl font-serif font-bold">Additional Information</h3>
                <ChevronDown className={`w-6 h-6 transition-transform ${expandedSections.includes("additional") ? "rotate-180" : ""}`} />
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

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <Button type="submit" size="lg" isLoading={isSubmitting} className="min-w-64">
                Submit Project Request
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
            <a
              href="https://www.instagram.com/jonescustomhomes/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center text-gray-700 hover:text-black transition-colors"
              title="Follow us on Instagram"
            >
              <Instagram className="w-8 h-8" />
            </a>
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  );
}
