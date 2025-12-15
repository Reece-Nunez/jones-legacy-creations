"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/Button";

const companies = [
  {
    id: "construction",
    name: "Jones Custom Homes",
    subtitle: "Custom Construction",
    description: "From concept to completion, we deliver exceptional construction projects on time and within budget.",
    icon: "/JONES CUSTOM HOMES ICON (2).svg",
    href: "/services/construction",
    features: ["Residential Construction", "Commercial Projects", "Renovations", "Project Management"],
  },
  {
    id: "realty",
    name: "Blake Jones Realty",
    subtitle: "Real Estate Services",
    description: "Find your dream property or let us help you sell. Expert guidance through every step.",
    icon: "/JONES REALTY ICON (2).svg",
    href: "/services/real-estate",
    features: ["Property Search", "Market Analysis", "Buyer/Seller Representation", "Investment Consulting"],
  },
  {
    id: "interiors",
    name: "Interiors By Jones",
    subtitle: "Design & Staging",
    description: "Transform spaces with professional interior design and staging services that captivate.",
    icon: "/JONES Interior Design & Staging ICON (2).svg",
    href: "/services/interior-design",
    features: ["Interior Design", "Home Staging", "Space Planning", "Color Consultation"],
  },
];

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
      <section className="min-h-screen bg-gradient-to-br from-gray-50 to-white pt-32 pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4">
              Building Legacies,
              <br />
              <span className="text-gray-500">One Project at a Time</span>
            </h1>
            <p className="text-gray-600 max-w-xl mx-auto">
              Three specialized brands working together to deliver your complete home journey.
            </p>
          </motion.div>

          {/* Staggered glass cards */}
          <div className="relative flex flex-col md:flex-row justify-center items-center gap-6 md:gap-8">
            {companies.map((company, i) => (
              <motion.div
                key={company.id}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className={`w-full md:w-[340px] bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 backdrop-blur-xl border border-white/10 rounded-3xl p-8
                  ${i === 1 ? "md:-mx-6 md:z-20 md:scale-110 hover:md:scale-[1.15]" : "md:z-10 hover:md:scale-105"}
                  hover:border-white/20 transition-all duration-500 group cursor-pointer`}
              >
                <div className="w-20 h-20 flex items-center justify-center mb-6">
                  <Image src={company.icon} alt="" width={56} height={56} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-white mb-1">{company.name}</h3>
                <p className="text-white/50 text-sm mb-4">{company.subtitle}</p>
                <p className="text-white/70 text-sm mb-6">{company.description}</p>
                <ul className="space-y-2 mb-6">
                  {company.features.slice(0, 3).map((f) => (
                    <li key={f} className="text-white/60 text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={company.href} className="inline-flex items-center gap-2 text-white font-medium text-sm group-hover:gap-3 transition-all">
                  Learn More <ArrowRight className="w-4 h-4" />
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

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
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
                <div className="text-gray-600 text-sm md:text-base">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
