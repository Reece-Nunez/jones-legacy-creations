"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Handshake, Award, CheckCircle, Users, ArrowRight } from "lucide-react";

export default function PartnersPage() {
  const partners = [
    {
      name: "Premium Building Supply Co.",
      category: "Building Materials",
      description: "High-quality construction materials and supplies for all project types.",
      specialization: "Lumber, Roofing, Siding",
    },
    {
      name: "Elite Electrical Systems",
      category: "Electrical",
      description: "Licensed electrical contractors providing comprehensive electrical services.",
      specialization: "Residential & Commercial Electrical",
    },
    {
      name: "ProFlow Plumbing Solutions",
      category: "Plumbing",
      description: "Expert plumbing services for new construction and renovations.",
      specialization: "Plumbing Installation & Repair",
    },
    {
      name: "Climate Control HVAC",
      category: "HVAC",
      description: "Professional heating, cooling, and ventilation system specialists.",
      specialization: "HVAC Design & Installation",
    },
    {
      name: "Precision Architectural Design",
      category: "Architecture",
      description: "Award-winning architectural firm specializing in residential and commercial design.",
      specialization: "Architectural Plans & 3D Rendering",
    },
    {
      name: "Foundation & Structural Engineers",
      category: "Engineering",
      description: "Licensed structural engineers ensuring safe, code-compliant designs.",
      specialization: "Structural Analysis & Engineering",
    },
    {
      name: "Artisan Cabinetry & Millwork",
      category: "Custom Millwork",
      description: "Custom cabinetry and millwork crafted with precision and artistry.",
      specialization: "Custom Cabinets & Built-ins",
    },
    {
      name: "Designer Flooring Gallery",
      category: "Flooring",
      description: "Extensive selection of premium flooring materials and installation services.",
      specialization: "Hardwood, Tile, Carpet",
    },
    {
      name: "Apex Roofing Specialists",
      category: "Roofing",
      description: "Professional roofing installation, repair, and maintenance services.",
      specialization: "All Roofing Types",
    },
    {
      name: "Landscape Design Pros",
      category: "Landscaping",
      description: "Transform outdoor spaces with professional landscape design and installation.",
      specialization: "Landscape Design & Hardscaping",
    },
    {
      name: "Professional Home Inspections",
      category: "Inspection Services",
      description: "Thorough home inspections for buyers, sellers, and new construction.",
      specialization: "Pre-Sale & Post-Construction Inspections",
    },
    {
      name: "Smart Home Integration Experts",
      category: "Technology",
      description: "Cutting-edge smart home technology integration and automation.",
      specialization: "Home Automation Systems",
    },
  ];

  const benefits = [
    {
      icon: Award,
      title: "Vetted Professionals",
      description: "All our partners are carefully selected for their expertise, reliability, and quality of work.",
    },
    {
      icon: CheckCircle,
      title: "Quality Assurance",
      description: "We work only with licensed, insured professionals who meet our high standards.",
    },
    {
      icon: Users,
      title: "Coordinated Service",
      description: "Seamless collaboration between all partners ensures smooth project execution.",
    },
    {
      icon: Handshake,
      title: "Trusted Network",
      description: "Years of successful partnerships built on trust, integrity, and exceptional results.",
    },
  ];

  const partnerCategories = [
    "Building Materials",
    "Electrical",
    "Plumbing",
    "HVAC",
    "Architecture",
    "Engineering",
    "Custom Millwork",
    "Flooring",
    "Roofing",
    "Landscaping",
    "Inspection Services",
    "Technology",
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
              <Handshake className="w-10 h-10" />
            </div>
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">
              Our Trusted Partners
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We've built a network of exceptional professionals who share our commitment to quality, integrity, and client satisfaction.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-serif font-bold mb-4">
              The Partner Advantage
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Working with our partner network ensures quality and reliability at every stage
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-black text-white rounded-full mb-4">
                  <benefit.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Categories */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-serif font-bold mb-4">
              Partner Categories
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive coverage across all aspects of construction and real estate
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {partnerCategories.map((category, index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-white p-4 rounded-lg text-center border-2 border-gray-200 hover:border-black transition-colors"
              >
                <p className="font-medium">{category}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners List */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-serif font-bold mb-4">
              Meet Our Partners
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Trusted professionals dedicated to excellence in their fields
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {partners.map((partner, index) => (
              <motion.div
                key={partner.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-gray-50 p-6 rounded-xl hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-1">{partner.name}</h3>
                    <div className="inline-block px-3 py-1 bg-black text-white text-xs rounded-full">
                      {partner.category}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-3">{partner.description}</p>
                <div className="text-sm text-gray-500">
                  <strong>Specialty:</strong> {partner.specialization}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Become a Partner CTA */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              Interested in Becoming a Partner?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              We're always looking to expand our network with qualified, professional service providers who share our values.
            </p>
            <Link href="/contact">
              <Button size="lg" variant="secondary">
                Contact Us About Partnership
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  );
}
