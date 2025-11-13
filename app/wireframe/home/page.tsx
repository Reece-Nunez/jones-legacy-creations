"use client";

import { Building2, Home, Palette, CheckCircle } from "lucide-react";
import { WireframeNav } from "@/components/WireframeNav";

export default function WireframeHomePage() {
  return (
    <div className="bg-gray-100">
      <WireframeNav />

      {/* Hero Section - Wireframe */}
      <section className="relative min-h-screen flex items-center justify-center bg-white border-b-8 border-gray-400 pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            {/* Wireframe annotation */}
            <div className="wireframe-label mb-4">[HERO SECTION]</div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-gray-900 border-4 border-dashed border-gray-400 p-6 inline-block">
              Building Legacies,
              <br />
              One Project at a Time
            </h1>

            <div className="my-8 border-4 border-dashed border-gray-300 p-6 max-w-3xl mx-auto">
              <p className="text-xl md:text-2xl text-gray-600">
                Comprehensive construction, real estate, and interior design services tailored to bring your vision to life.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
              <div className="border-4 border-gray-800 px-8 py-4 bg-white">
                <span className="font-bold text-lg">START YOUR PROJECT →</span>
              </div>
              <div className="border-4 border-gray-400 px-8 py-4 bg-white">
                <span className="font-bold text-lg">LEARN MORE</span>
              </div>
            </div>

            {/* Scroll indicator wireframe */}
            <div className="mt-16">
              <div className="wireframe-label">[SCROLL INDICATOR]</div>
              <div className="w-6 h-10 border-4 border-gray-400 rounded-full mx-auto mt-2" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section - Wireframe */}
      <section className="py-20 bg-gray-800 text-white border-b-8 border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-gray-400 text-center mb-8">[STATISTICS SECTION]</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {["500+", "15+", "98%", "50+"].map((stat, i) => (
              <div key={i} className="text-center border-4 border-dashed border-gray-600 p-6">
                <div className="text-5xl font-bold mb-2">{stat}</div>
                <div className="text-gray-400 text-sm">
                  {i === 0 && "Projects Completed"}
                  {i === 1 && "Years Experience"}
                  {i === 2 && "Client Satisfaction"}
                  {i === 3 && "Industry Partners"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section - Wireframe */}
      <section className="py-24 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-4">[SERVICES SECTION]</div>

          <div className="text-center mb-16 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900">
              Our Services
            </h2>
            <p className="text-xl text-gray-600">
              Comprehensive solutions for all your construction, real estate, and design needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Home, title: "Real Estate", features: ["Property Search", "Market Analysis", "Buyer/Seller Representation", "Investment Consulting"] },
              { icon: Building2, title: "Construction", features: ["Residential Construction", "Commercial Projects", "Renovations", "Project Management"] },
              { icon: Palette, title: "Interior Design & Staging", features: ["Interior Design", "Home Staging", "Space Planning", "Color Consultation"] },
            ].map((service, index) => (
              <div key={index} className="border-4 border-gray-400 p-8 bg-white">
                <div className="wireframe-label mb-2">[SERVICE CARD {index + 1}]</div>
                <div className="w-12 h-12 border-4 border-gray-600 mb-6 flex items-center justify-center">
                  <service.icon className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3 border-b-2 border-gray-300 pb-2">
                  {service.title}
                </h3>
                <div className="border-2 border-dashed border-gray-300 p-4 mb-6">
                  <div className="h-16 bg-gray-100" />
                </div>
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-gray-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="border-2 border-gray-600 px-4 py-2 inline-block">
                  <span className="text-sm font-bold">Learn More →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Wireframe */}
      <section className="py-24 bg-gray-800 text-white border-b-8 border-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="wireframe-label text-gray-400 mb-8">[CALL TO ACTION]</div>
          <div className="border-4 border-dashed border-gray-600 p-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Start Your Next Project?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Let's discuss how we can help bring your vision to life.
            </p>
            <div className="border-4 border-white px-8 py-4 inline-block bg-gray-800">
              <span className="font-bold text-lg">GET IN TOUCH →</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Wireframe */}
      <footer className="bg-gray-900 text-white border-t-8 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="wireframe-label text-gray-600 mb-8">[FOOTER]</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="border-2 border-dashed border-gray-700 p-6">
              <div className="font-bold mb-4 text-lg">[COMPANY INFO]</div>
              <div className="space-y-2 text-sm text-gray-400">
                <div>Phone: (123) 456-7890</div>
                <div>Email: info@joneslegacy.com</div>
                <div>Location: Your City, State</div>
              </div>
            </div>
            <div className="border-2 border-dashed border-gray-700 p-6">
              <div className="font-bold mb-4">[SERVICES LINKS]</div>
              <div className="space-y-2 text-sm text-gray-400">
                <div>Real Estate</div>
                <div>Construction</div>
                <div>Interior Design</div>
              </div>
            </div>
            <div className="border-2 border-dashed border-gray-700 p-6">
              <div className="font-bold mb-4">[COMPANY LINKS]</div>
              <div className="space-y-2 text-sm text-gray-400">
                <div>About Us</div>
                <div>Our Partners</div>
                <div>Contact</div>
              </div>
            </div>
            <div className="border-2 border-dashed border-gray-700 p-6">
              <div className="font-bold mb-4">[GET STARTED]</div>
              <div className="border-2 border-gray-600 px-4 py-2 inline-block text-sm">
                START A PROJECT
              </div>
            </div>
          </div>
          <div className="border-t-2 border-gray-700 mt-12 pt-8 text-center text-sm text-gray-500">
            © 2024 Jones Legacy Creations. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
