"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export default function AboutPage() {
  return (
    <>
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-12 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">
              About Us
            </h1>
          </motion.div>
        </div>
      </section>

      {/* Story & Photo Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Family Photo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden"
            >
              {/* Replace /family-photo.jpg with your actual family photo */}
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-2">📷</div>
                  <p className="text-sm">Family Photo</p>
                  <p className="text-xs text-gray-300">Replace with /family-photo.jpg</p>
                </div>
              </div>
              {/* Uncomment this when you have the photo:
              <Image
                src="/family-photo.jpg"
                alt="The Jones Family"
                fill
                className="object-cover"
              />
              */}
            </motion.div>

            {/* Our Story */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-serif font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Jones Legacy Creations is a family-owned business built on the values of integrity, quality, and personalized service. What began as a passion for creating beautiful homes has grown into a comprehensive suite of services spanning custom home construction, real estate, and interior design.
                </p>
                <p>
                  We believe that building a home is about more than just construction—it's about creating a space where families grow, memories are made, and legacies are built. That's why we take a hands-on approach to every project, treating each client like family and every home as if it were our own.
                </p>
                <p>
                  From the first consultation to the final walkthrough, we're committed to making your vision a reality with craftsmanship you can trust and service you can count on.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-serif font-bold mb-8 text-center">Why Choose Us?</h2>
            <div className="bg-white rounded-2xl p-8 lg:p-12 shadow-sm">
              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong className="font-semibold">Family-Owned & Operated:</strong>
                    <span className="text-gray-700"> We treat every client like family and every project like it's our own home.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong className="font-semibold">Comprehensive Services:</strong>
                    <span className="text-gray-700"> From design to construction to sale—all your property needs under one roof.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong className="font-semibold">Quality Craftsmanship:</strong>
                    <span className="text-gray-700"> We never cut corners. Every detail matters to us.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong className="font-semibold">Local Expertise:</strong>
                    <span className="text-gray-700"> Deep roots in the community with trusted relationships and local knowledge.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong className="font-semibold">Transparent Communication:</strong>
                    <span className="text-gray-700"> You'll always know where your project stands. No surprises.</span>
                  </div>
                </li>
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  );
}
