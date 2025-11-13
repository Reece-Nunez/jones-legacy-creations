"use client";

import { WireframeNav } from "@/components/WireframeNav";
import { Handshake, Award, CheckCircle, Users } from "lucide-react";

export default function WireframePartnersPage() {
  return (
    <div className="bg-gray-100">
      <WireframeNav />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="wireframe-label mb-4">[PARTNERS PAGE HERO]</div>
            <div className="w-20 h-20 border-4 border-gray-800 mx-auto mb-6 flex items-center justify-center">
              <Handshake className="w-10 h-10" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 border-4 border-dashed border-gray-400 p-6 inline-block">
              Our Trusted Partners
            </h1>
            <div className="border-4 border-dashed border-gray-300 p-6 max-w-3xl mx-auto">
              <p className="text-xl text-gray-600">
                We've built a network of exceptional professionals who share our commitment to quality and excellence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[PARTNER BENEFITS]</div>
          <div className="text-center mb-16 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">The Partner Advantage</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Award, title: "Vetted Professionals" },
              { icon: CheckCircle, title: "Quality Assurance" },
              { icon: Users, title: "Coordinated Service" },
              { icon: Handshake, title: "Trusted Network" },
            ].map((benefit, i) => (
              <div key={i} className="border-4 border-gray-400 p-6 text-center bg-gray-50">
                <div className="wireframe-label mb-2">[BENEFIT {i + 1}]</div>
                <div className="w-16 h-16 border-4 border-gray-800 mx-auto mb-4 flex items-center justify-center">
                  <benefit.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
                <div className="border-2 border-dashed border-gray-300 p-3 bg-white">
                  <div className="h-12" />
                  <p className="text-xs text-gray-500 mt-2">[Description]</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-gray-50 border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[PARTNER CATEGORIES]</div>
          <div className="text-center mb-16 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Partner Categories</h2>
            <p className="text-xl text-gray-600">Comprehensive coverage across all aspects</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
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
              "Inspection",
              "Technology",
            ].map((category, i) => (
              <div key={i} className="border-4 border-gray-400 p-4 text-center bg-white">
                <p className="font-medium text-sm">{category}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Grid */}
      <section className="py-20 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[PARTNER PROFILES]</div>
          <div className="text-center mb-16 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Meet Our Partners</h2>
            <p className="text-xl text-gray-600">Trusted professionals dedicated to excellence</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="border-4 border-gray-400 p-6 bg-gray-50">
                <div className="wireframe-label mb-4">[PARTNER {i + 1}]</div>
                <h3 className="text-xl font-bold mb-2">Partner Company Name</h3>
                <div className="inline-block px-3 py-1 bg-gray-800 text-white text-xs mb-3">
                  CATEGORY
                </div>
                <div className="border-2 border-dashed border-gray-300 p-3 bg-white mb-3">
                  <div className="h-12" />
                  <p className="text-xs text-gray-500 mt-2">[Company description]</p>
                </div>
                <div className="text-sm">
                  <strong className="text-xs">Specialty:</strong>
                  <span className="text-xs text-gray-600 ml-1">[Specialization]</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-800 text-white border-b-8 border-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="wireframe-label text-gray-400 mb-8">[PARTNERSHIP CTA]</div>
          <div className="border-4 border-dashed border-gray-600 p-12">
            <h2 className="text-4xl font-bold mb-6">
              Interested in Becoming a Partner?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              We're always looking to expand our network with qualified professionals.
            </p>
            <div className="border-4 border-white px-8 py-4 inline-block">
              <span className="font-bold">CONTACT US ABOUT PARTNERSHIP →</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
