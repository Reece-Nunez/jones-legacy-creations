"use client";

import { motion } from "framer-motion";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Target, Users, Award, TrendingUp } from "lucide-react";

export default function AboutPage() {
  const values = [
    {
      icon: Target,
      title: "Mission-Driven",
      description: "We're committed to delivering excellence in every project, building lasting relationships with our clients.",
    },
    {
      icon: Users,
      title: "Client-Focused",
      description: "Your vision is our priority. We listen, understand, and execute with precision and care.",
    },
    {
      icon: Award,
      title: "Quality First",
      description: "From materials to craftsmanship, we never compromise on quality and attention to detail.",
    },
    {
      icon: TrendingUp,
      title: "Growth-Oriented",
      description: "We continuously evolve, adapting to industry trends and embracing innovation.",
    },
  ];

  const timeline = [
    { year: "2008", event: "Jones Legacy Creations Founded", description: "Started with a vision to provide comprehensive property services." },
    { year: "2012", event: "Expanded to Interior Design", description: "Added professional interior design and home staging services." },
    { year: "2015", event: "500th Project Completed", description: "Reached a major milestone with over 500 successful projects." },
    { year: "2020", event: "Partner Network Established", description: "Built a network of trusted industry partners and suppliers." },
    { year: "2024", event: "Industry Leader", description: "Recognized as a leading provider in construction, real estate, and design." },
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
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-6">
              About Jones Legacy Creations
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              For over 15 years, we've been dedicated to creating exceptional spaces and experiences through construction, real estate, and interior design.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-serif font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-700 leading-relaxed">
                <p>
                  Jones Legacy Creations began with a simple belief: that exceptional construction, real estate, and design services should be accessible, transparent, and tailored to each client's unique vision.
                </p>
                <p>
                  What started as a small construction company has evolved into a comprehensive service provider, offering everything from residential construction and commercial projects to real estate guidance and professional interior design.
                </p>
                <p>
                  Today, we're proud to have completed over 500 projects, working with homeowners, businesses, and investors who trust us to bring their dreams to life. Our commitment to quality, integrity, and client satisfaction drives everything we do.
                </p>
                <p>
                  Led by experienced professionals and supported by a network of skilled partners, Jones Legacy Creations continues to set the standard for excellence in the industry.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="bg-gray-100 rounded-2xl p-8 lg:p-12"
            >
              <h3 className="text-2xl font-serif font-bold mb-6">Why Choose Us?</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong className="font-semibold">Comprehensive Services:</strong>
                    <span className="text-gray-700"> All your property needs under one roof.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong className="font-semibold">Experienced Team:</strong>
                    <span className="text-gray-700"> 15+ years of industry expertise.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong className="font-semibold">Quality Guarantee:</strong>
                    <span className="text-gray-700"> We stand behind every project we deliver.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong className="font-semibold">Client-First Approach:</strong>
                    <span className="text-gray-700"> Your satisfaction is our success.</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-black rounded-full mt-2 flex-shrink-0" />
                  <div>
                    <strong className="font-semibold">Trusted Partners:</strong>
                    <span className="text-gray-700"> Network of vetted suppliers and specialists.</span>
                  </div>
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-serif font-bold mb-4">Our Core Values</h2>
            <p className="text-xl text-gray-600">The principles that guide our work every day</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white p-6 rounded-xl text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-black text-white rounded-full mb-4">
                  <value.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                <p className="text-gray-600 text-sm">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-serif font-bold mb-4">Our Journey</h2>
            <p className="text-xl text-gray-600">Milestones that shaped who we are today</p>
          </motion.div>

          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-1/2 transform -translate-x-1/2 w-0.5 h-full bg-gray-200 hidden md:block" />

            <div className="space-y-12">
              {timeline.map((item, index) => (
                <motion.div
                  key={item.year}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className={`relative flex items-center ${
                    index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  <div className={`w-full md:w-1/2 ${index % 2 === 0 ? "md:pr-12" : "md:pl-12"}`}>
                    <div className="bg-gray-50 p-6 rounded-xl">
                      <div className="text-3xl font-serif font-bold mb-2">{item.year}</div>
                      <h3 className="text-xl font-bold mb-2">{item.event}</h3>
                      <p className="text-gray-600">{item.description}</p>
                    </div>
                  </div>

                  {/* Timeline dot */}
                  <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 w-4 h-4 bg-black rounded-full border-4 border-white" />

                  <div className="w-full md:w-1/2" />
                </motion.div>
              ))}
            </div>
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
            <h2 className="text-4xl font-serif font-bold mb-6">
              Let's Build Something Amazing Together
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Experience the Jones Legacy Creations difference. Contact us today to discuss your project.
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </>
  );
}
