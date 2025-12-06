"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pb-32">
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
              className="text-5xl md:text-7xl font-serif font-bold tracking-tight mb-12"
            >
              Building Legacies,
              <br />
              <span className="text-gray-600">One Project at a Time</span>
            </motion.h1>

            {/* Brand Family Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mb-12 max-w-5xl mx-auto"
            >
              <div className="bg-white/80 backdrop-blur-sm border-2 border-gray-200 rounded-2xl p-4 sm:p-8 shadow-lg">
                <p className="text-sm text-gray-600 mb-6 text-center max-w-2xl mx-auto">
                  <span className="font-semibold text-gray-900">Jones Legacy Creations</span> brings all three brands together under one roof, delivering a seamless experience from initial design to final sale — your one-stop shop for interior design, custom homes, and real estate.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                  {/* Jones Custom Homes */}
                  <div className="flex flex-col items-center text-center group">
                    <div className="w-24 h-24 mb-4 flex items-center justify-center">
                      <Image
                        src="/JONES CUSTOM HOMES ICON (2).svg"
                        alt="Jones Custom Homes"
                        width={96}
                        height={96}
                        className="object-contain"
                      />
                    </div>
                    <h3 className="font-serif font-bold text-lg mb-1">Jones Custom Homes</h3>
                    <p className="text-sm text-gray-600">Custom Construction</p>

                    {/* Service Card */}
                    <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200 text-left w-full">
                      <h4 className="font-bold text-xs sm:text-sm uppercase tracking-wide mb-2">Custom Built Homes</h4>
                      <p className="text-xs text-gray-600 mb-3">
                        From concept to completion, we deliver exceptional construction projects on time and within budget.
                      </p>
                      <ul className="space-y-1 mb-3">
                        <li className="flex items-center gap-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          Residential Construction
                        </li>
                        <li className="flex items-center gap-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          Commercial Projects
                        </li>
                        <li className="flex items-center gap-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          Renovations
                        </li>
                        <li className="flex items-center gap-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          Project Management
                        </li>
                      </ul>
                      <Link href="/services/construction" className="flex items-center gap-1 text-xs font-medium hover:gap-2 transition-all">
                        Learn More <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Blake Jones Realty */}
                  <div className="flex flex-col items-center text-center group">
                    <div className="w-24 h-24 mb-4 flex items-center justify-center">
                      <Image
                        src="/JONES REALTY ICON (2).svg"
                        alt="Blake Jones Realty"
                        width={110}
                        height={110}
                        className="object-contain scale-110"
                      />
                    </div>
                    <h3 className="font-serif font-bold text-lg mb-1">Blake Jones Realty</h3>
                    <p className="text-sm text-gray-600">Real Estate Services</p>

                    {/* Service Card */}
                    <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200 text-left w-full">
                      <h4 className="font-bold text-xs sm:text-sm uppercase tracking-wide mb-2">Real Estate Services</h4>
                      <p className="text-xs text-gray-600 mb-3">
                        Find your dream property or let us help you sell. Expert guidance through every step of the way.
                      </p>
                      <ul className="space-y-1 mb-3">
                        <li className="flex items-center gap-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          Property Search
                        </li>
                        <li className="flex items-center gap-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          Market Analysis
                        </li>
                        <li className="flex items-center gap-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          Buyer/Seller Representation
                        </li>
                        <li className="flex items-center gap-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          Investment Consulting
                        </li>
                      </ul>
                      <Link href="/services/real-estate" className="flex items-center gap-1 text-xs font-medium hover:gap-2 transition-all">
                        Learn More <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Interiors By Jones Custom Homes */}
                  <div className="flex flex-col items-center text-center group">
                    <div className="w-24 h-24 mb-4 flex items-center justify-center">
                      <Image
                        src="/JONES Interior Design & Staging ICON (2).svg"
                        alt="Interiors By Jones Custom Homes"
                        width={96}
                        height={96}
                        className="object-contain"
                      />
                    </div>
                    <h3 className="font-serif font-bold text-lg mb-1">Interiors By Jones Custom Homes</h3>
                    <p className="text-sm text-gray-600">Design & Staging</p>

                    {/* Service Card */}
                    <div className="mt-4 p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-200 text-left w-full">
                      <h4 className="font-bold text-xs sm:text-sm uppercase tracking-wide mb-2">Designing & Staging</h4>
                      <p className="text-xs text-gray-600 mb-3">
                        Transform spaces with professional interior design and home staging services that captivate and inspire.
                      </p>
                      <ul className="space-y-1 mb-3">
                        <li className="flex items-center gap-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          Interior Design
                        </li>
                        <li className="flex items-center gap-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          Home Staging
                        </li>
                        <li className="flex items-center gap-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          Space Planning
                        </li>
                        <li className="flex items-center gap-2 text-xs text-gray-700">
                          <CheckCircle className="w-3 h-3 flex-shrink-0" />
                          Color Consultation
                        </li>
                      </ul>
                      <Link href="/services/interior-design" className="flex items-center gap-1 text-xs font-medium hover:gap-2 transition-all">
                        Learn More <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
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
