"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { Palette, Home, Sparkles, Eye, Ruler, PaintBucket, ArrowRight } from "lucide-react";

export default function InteriorDesignPage() {
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <p className="text-gray-600 mb-6">
              Ready to see your space transformed? Get in touch to discuss your project.
            </p>
            <Link href="/contact">
              <Button size="lg">
                Start Your Design Journey
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
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
              Ready to Transform Your Space?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Whether you're looking to redesign your home or stage a property for sale, we're here to help.
            </p>
            <Link href="/contact">
              <Button size="lg" variant="secondary">
                Get Started Today
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
