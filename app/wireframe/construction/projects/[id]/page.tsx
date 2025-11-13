"use client";

import { WireframeNav } from "@/components/WireframeNav";
import { Building2, Calendar, MapPin, DollarSign, Ruler, Users, ArrowLeft, Image } from "lucide-react";
import Link from "next/link";

export default function WireframeProjectDetailPage() {
  return (
    <div className="bg-gray-100">
      <WireframeNav />

      {/* Back Button */}
      <section className="pt-24 pb-8 bg-white border-b-4 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/wireframe/construction"
            className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Construction Services
          </Link>
        </div>
      </section>

      {/* Project Hero */}
      <section className="pt-16 pb-12 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label mb-4">[PROJECT HERO SECTION]</div>

          {/* Status Badge */}
          <div className="mb-4">
            <span className="inline-block px-4 py-2 bg-green-400 text-gray-900 text-sm font-bold">
              COMPLETED
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 border-4 border-dashed border-gray-400 p-6 inline-block">
            Modern Family Home
          </h1>

          <div className="border-4 border-dashed border-gray-300 p-6 max-w-3xl mb-8">
            <p className="text-xl text-gray-600">
              A beautiful 3,500 sq ft contemporary home featuring open-concept living, high-end finishes, and sustainable design elements.
            </p>
          </div>

          {/* Project Quick Info */}
          <div className="wireframe-label mb-4">[PROJECT KEY INFO CARDS]</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: MapPin, label: "Location", value: "Austin, TX" },
              { icon: Calendar, label: "Completed", value: "March 2024" },
              { icon: Ruler, label: "Size", value: "3,500 sq ft" },
              { icon: DollarSign, label: "Budget", value: "$450,000" },
            ].map((info, i) => (
              <div key={i} className="border-4 border-gray-400 p-4 bg-gray-50 text-center">
                <div className="flex justify-center mb-2">
                  <info.icon className="w-6 h-6" />
                </div>
                <div className="text-xs text-gray-500 mb-1">{info.label}</div>
                <div className="font-bold">{info.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Image Gallery */}
      <section className="py-20 bg-gray-50 border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[PROJECT IMAGE GALLERY]</div>

          <div className="text-center mb-12 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Project Gallery</h2>
            <p className="text-lg text-gray-600">Click images to view full size</p>
          </div>

          {/* Main Image */}
          <div className="wireframe-label mb-4">[MAIN/HERO IMAGE]</div>
          <div className="aspect-[16/9] bg-gradient-to-br from-gray-200 to-gray-300 border-8 border-gray-400 mb-8 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Image className="w-24 h-24 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-bold text-xl">[MAIN PROJECT IMAGE]</p>
              </div>
            </div>
          </div>

          {/* Thumbnail Gallery */}
          <div className="wireframe-label mb-4">[GALLERY THUMBNAILS - CLICKABLE]</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 border-4 border-gray-400 relative cursor-pointer hover:border-gray-800 transition-colors"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Image className="w-12 h-12 text-gray-400 mx-auto" />
                    <p className="text-xs text-gray-500 mt-2">[IMG {i + 1}]</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Project Details */}
      <section className="py-20 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label mb-8">[PROJECT DETAILS SECTION]</div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="border-4 border-gray-400 p-8 bg-gray-50">
                <div className="wireframe-label mb-4">[PROJECT DESCRIPTION]</div>
                <h2 className="text-3xl font-bold mb-6 border-b-2 border-gray-400 pb-4">
                  Project Overview
                </h2>

                <div className="space-y-6">
                  {["The Challenge", "Our Approach", "The Result"].map((section, i) => (
                    <div key={i}>
                      <h3 className="text-xl font-bold mb-3 border-b border-gray-300 pb-2">
                        {section}
                      </h3>
                      <div className="border-2 border-dashed border-gray-300 p-4 bg-white">
                        <div className="h-24" />
                        <p className="text-xs text-gray-500 mt-2">[{section} paragraph text]</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar - Project Specs */}
            <div className="lg:col-span-1">
              <div className="border-4 border-gray-400 p-6 bg-gray-50 sticky top-24">
                <div className="wireframe-label mb-4">[PROJECT SPECIFICATIONS]</div>
                <h3 className="text-2xl font-bold mb-6 border-b-2 border-gray-400 pb-4">
                  Project Specs
                </h3>

                <div className="space-y-4">
                  {[
                    { label: "Project Type", value: "Residential - New Build" },
                    { label: "Timeline", value: "8 Months" },
                    { label: "Square Footage", value: "3,500 sq ft" },
                    { label: "Bedrooms", value: "4" },
                    { label: "Bathrooms", value: "3.5" },
                    { label: "Floors", value: "2 Story" },
                    { label: "Garage", value: "3-Car Attached" },
                    { label: "Lot Size", value: "0.5 Acre" },
                  ].map((spec, i) => (
                    <div key={i} className="flex justify-between border-b-2 border-gray-300 pb-2">
                      <span className="text-sm text-gray-600 font-medium">{spec.label}:</span>
                      <span className="text-sm font-bold">{spec.value}</span>
                    </div>
                  ))}
                </div>

                {/* Team Section */}
                <div className="mt-8 pt-6 border-t-2 border-gray-400">
                  <div className="wireframe-label mb-4">[PROJECT TEAM]</div>
                  <h4 className="font-bold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Project Team
                  </h4>
                  <div className="space-y-3 text-sm">
                    {[
                      { role: "Project Manager", name: "John Doe" },
                      { role: "Lead Architect", name: "Jane Smith" },
                      { role: "General Contractor", name: "Bob Wilson" },
                    ].map((member, i) => (
                      <div key={i} className="border-2 border-gray-300 p-2 bg-white">
                        <div className="font-bold text-xs">{member.role}</div>
                        <div className="text-gray-600 text-xs">{member.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features & Highlights */}
      <section className="py-20 bg-gray-50 border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[KEY FEATURES SECTION]</div>

          <div className="text-center mb-12 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Key Features</h2>
            <p className="text-lg text-gray-600">Notable aspects of this project</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              "Open-concept living spaces",
              "High-end kitchen appliances",
              "Custom millwork throughout",
              "Energy-efficient windows",
              "Smart home automation",
              "Sustainable materials",
              "Luxury master suite",
              "Covered outdoor patio",
              "Professional landscaping",
            ].map((feature, i) => (
              <div key={i} className="border-4 border-gray-400 p-4 bg-white flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-800 rounded-full flex-shrink-0" />
                <span className="font-medium">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Projects */}
      <section className="py-20 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[RELATED PROJECTS]</div>

          <div className="text-center mb-12 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Related Projects</h2>
            <p className="text-lg text-gray-600">You might also be interested in</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <a
                key={i}
                href={`/wireframe/construction/projects/project-${i}`}
                className="group border-4 border-gray-400 bg-white overflow-hidden hover:border-gray-800"
              >
                <div className="wireframe-label p-2">[RELATED PROJECT {i}]</div>
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 border-t-4 border-gray-400 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Building2 className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
                <div className="p-4 border-t-4 border-gray-400">
                  <h3 className="font-bold mb-1 group-hover:underline">Related Project Title</h3>
                  <p className="text-xs text-gray-500">Category • Location</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-800 text-white border-b-8 border-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="wireframe-label text-gray-400 mb-8">[CALL TO ACTION]</div>
          <div className="border-4 border-dashed border-gray-600 p-12">
            <h2 className="text-4xl font-bold mb-6">
              Ready to Start Your Project?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Let's bring your construction vision to life
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/wireframe/construction" className="border-4 border-white px-8 py-4 inline-block hover:bg-white hover:text-gray-800">
                <span className="font-bold">START PROJECT FORM</span>
              </Link>
              <Link href="/wireframe/contact" className="border-4 border-gray-400 px-8 py-4 inline-block hover:bg-gray-700">
                <span className="font-bold">CONTACT US</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
