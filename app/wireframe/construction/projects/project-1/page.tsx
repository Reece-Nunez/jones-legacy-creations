"use client";

import { WireframeNav } from "@/components/WireframeNav";
import { Building2, Calendar, MapPin, DollarSign, Ruler, Users, ArrowLeft, Image } from "lucide-react";
import Link from "next/link";

export default function WireframeProject1Page() {
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
          <div className="wireframe-label mb-4">[PROJECT 1 HERO]</div>

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
              A stunning 3,500 sq ft contemporary residence featuring open-concept living, floor-to-ceiling windows, and sustainable design throughout.
            </p>
          </div>

          <div className="wireframe-label mb-4">[KEY INFO]</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border-4 border-gray-400 p-4 bg-gray-50 text-center">
              <MapPin className="w-6 h-6 mx-auto mb-2" />
              <div className="text-xs text-gray-500 mb-1">Location</div>
              <div className="font-bold">Austin, TX</div>
            </div>
            <div className="border-4 border-gray-400 p-4 bg-gray-50 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2" />
              <div className="text-xs text-gray-500 mb-1">Completed</div>
              <div className="font-bold">March 2024</div>
            </div>
            <div className="border-4 border-gray-400 p-4 bg-gray-50 text-center">
              <Ruler className="w-6 h-6 mx-auto mb-2" />
              <div className="text-xs text-gray-500 mb-1">Size</div>
              <div className="font-bold">3,500 sq ft</div>
            </div>
            <div className="border-4 border-gray-400 p-4 bg-gray-50 text-center">
              <DollarSign className="w-6 h-6 mx-auto mb-2" />
              <div className="text-xs text-gray-500 mb-1">Investment</div>
              <div className="font-bold">$450K</div>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="py-20 bg-gray-50 border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[IMAGE GALLERY]</div>

          <div className="aspect-[16/9] bg-gradient-to-br from-gray-200 to-gray-300 border-8 border-gray-400 mb-8 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Image className="w-24 h-24 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 font-bold text-xl">[MAIN IMAGE]</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 border-4 border-gray-400 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Image className="w-12 h-12 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="py-20 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 border-4 border-gray-400 p-8 bg-gray-50">
              <h2 className="text-3xl font-bold mb-6">Project Overview</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-3">The Challenge</h3>
                  <div className="border-2 border-dashed border-gray-300 p-4 bg-white h-32" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3">Our Approach</h3>
                  <div className="border-2 border-dashed border-gray-300 p-4 bg-white h-32" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-3">The Result</h3>
                  <div className="border-2 border-dashed border-gray-300 p-4 bg-white h-32" />
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 border-4 border-gray-400 p-6 bg-gray-50">
              <h3 className="text-2xl font-bold mb-6">Specifications</h3>
              <div className="space-y-3 text-sm">
                {[
                  ["Type", "New Build"],
                  ["Timeline", "8 Months"],
                  ["Size", "3,500 sq ft"],
                  ["Bedrooms", "4"],
                  ["Bathrooms", "3.5"],
                  ["Floors", "2 Story"],
                  ["Garage", "3-Car"],
                ].map(([label, value], i) => (
                  <div key={i} className="flex justify-between border-b-2 border-gray-300 pb-2">
                    <span className="text-gray-600">{label}:</span>
                    <span className="font-bold">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Start Your Project</h2>
          <div className="flex gap-4 justify-center">
            <Link href="/wireframe/construction" className="border-4 border-white px-8 py-4 font-bold hover:bg-white hover:text-gray-800">
              PROJECT FORM
            </Link>
            <Link href="/wireframe/contact" className="border-4 border-gray-400 px-8 py-4 font-bold">
              CONTACT US
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
