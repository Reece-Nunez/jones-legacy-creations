"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Building2, Home, Palette, ArrowRight, CheckCircle } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  const services = [
    {
      icon: Home,
      title: "Real Estate",
      description: "Find your dream property or let us help you sell. Expert guidance through every step of the real estate process.",
      href: "/services/real-estate",
      features: ["Property Search", "Market Analysis", "Buyer/Seller Representation", "Investment Consulting"],
    },
    {
      icon: Building2,
      title: "Construction",
      description: "From concept to completion, we deliver exceptional construction projects on time and within budget.",
      href: "/services/construction",
      features: ["Residential Construction", "Commercial Projects", "Renovations", "Project Management"],
    },
    {
      icon: Palette,
      title: "Interior Design & Staging",
      description: "Transform spaces with professional interior design and home staging services that captivate and inspire.",
      href: "/services/interior-design",
      features: ["Interior Design", "Home Staging", "Space Planning", "Color Consultation"],
    },
  ];

  const stats = [
    { value: "100+", label: "Projects Completed" },
    { value: "10+", label: "Years Experience" },
    { value: "98%", label: "Client Satisfaction" },
    { value: "50+", label: "Industry Partners" },
  ];

  return (
    <>
      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-5xl md:text-7xl font-serif font-bold tracking-tight mb-6"
            >
              Building Legacies,
              <br />
              <span className="text-gray-600">One Project at a Time</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto"
            >
              Comprehensive construction, real estate, and interior design services tailored to bring your vision to life.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/contact">
                <Button size="lg" className="w-full sm:w-auto min-w-[200px] h-[56px]">
                  Start Your Project
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/about">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto min-w-[200px] h-[56px]">
                  Learn More
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Animated scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-3"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-6 h-10 border-2 border-black rounded-full flex justify-center pt-2">
              <div className="w-1 h-2 bg-black rounded-full" />
            </div>
            <span className="text-sm font-medium text-black whitespace-nowrap">
              Scroll to See More
            </span>
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl md:text-5xl font-bold font-serif mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-400 text-sm md:text-base">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-24 bg-white">
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
              Comprehensive solutions for all your construction, real estate, and design needs.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link href={service.href}>
                  <div className="group h-full p-8 border-2 border-gray-200 rounded-2xl hover:border-black transition-all duration-300 hover:shadow-xl">
                    <service.icon className="w-12 h-12 mb-6 group-hover:scale-110 transition-transform" />
                    <h3 className="text-2xl font-serif font-bold mb-3">
                      {service.title}
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {service.description}
                    </p>
                    <ul className="space-y-2 mb-6">
                      {service.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2 text-sm font-medium group-hover:gap-4 transition-all">
                      Learn More
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">
              Ready to Start Your Next Project?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Let's discuss how we can help bring your vision to life.
            </p>
            <Link href="/contact">
              <Button size="lg" variant="secondary">
                Get in Touch
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
