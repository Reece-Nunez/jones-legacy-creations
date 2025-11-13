"use client";

import { WireframeNav } from "@/components/WireframeNav";
import { Building2, Calendar, MapPin, DollarSign, Ruler, ArrowLeft, Image } from "lucide-react";
import Link from "next/link";

export default function WireframeProject2Page() {
  return (
    <div className="bg-gray-100">
      <WireframeNav />
      <section className="pt-24 pb-8 bg-white border-b-4 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/wireframe/construction" className="inline-flex items-center gap-2 text-sm font-medium hover:underline">
            <ArrowLeft className="w-4 h-4" />
            Back to Construction Services
          </Link>
        </div>
      </section>
      <section className="pt-16 pb-12 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label mb-4">[PROJECT 2]</div>
          <span className="inline-block px-4 py-2 bg-green-400 text-gray-900 text-sm font-bold mb-4">COMPLETED</span>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 border-4 border-dashed border-gray-400 p-6 inline-block">
            Downtown Office Complex
          </h1>
          <div className="border-4 border-dashed border-gray-300 p-6 max-w-3xl mb-8">
            <p className="text-xl text-gray-600">
              A modern 15,000 sq ft commercial office building with state-of-the-art amenities and sustainable features.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border-4 border-gray-400 p-4 bg-gray-50 text-center">
              <MapPin className="w-6 h-6 mx-auto mb-2" />
              <div className="text-xs text-gray-500 mb-1">Location</div>
              <div className="font-bold">Dallas, TX</div>
            </div>
            <div className="border-4 border-gray-400 p-4 bg-gray-50 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2" />
              <div className="text-xs text-gray-500 mb-1">Completed</div>
              <div className="font-bold">January 2024</div>
            </div>
            <div className="border-4 border-gray-400 p-4 bg-gray-50 text-center">
              <Ruler className="w-6 h-6 mx-auto mb-2" />
              <div className="text-xs text-gray-500 mb-1">Size</div>
              <div className="font-bold">15,000 sq ft</div>
            </div>
            <div className="border-4 border-gray-400 p-4 bg-gray-50 text-center">
              <DollarSign className="w-6 h-6 mx-auto mb-2" />
              <div className="text-xs text-gray-500 mb-1">Investment</div>
              <div className="font-bold">$1.2M</div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-20 bg-gray-50 border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[GALLERY]</div>
          <div className="aspect-[16/9] bg-gradient-to-br from-gray-200 to-gray-300 border-8 border-gray-400 mb-8 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <Building2 className="w-24 h-24 text-gray-400" />
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
      <section className="py-20 bg-gray-800 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Start Your Project</h2>
          <div className="flex gap-4 justify-center">
            <Link href="/wireframe/construction" className="border-4 border-white px-8 py-4 font-bold">PROJECT FORM</Link>
            <Link href="/wireframe/contact" className="border-4 border-gray-400 px-8 py-4 font-bold">CONTACT</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
