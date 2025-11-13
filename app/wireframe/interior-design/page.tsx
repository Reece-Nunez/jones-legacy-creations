"use client";

import { WireframeNav } from "@/components/WireframeNav";
import { Palette, Eye, Sparkles, Ruler, PaintBucket } from "lucide-react";

export default function WireframeInteriorDesignPage() {
  return (
    <div className="bg-gray-100">
      <WireframeNav />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="wireframe-label mb-4">[INTERIOR DESIGN PAGE HERO]</div>
            <div className="w-20 h-20 border-4 border-gray-800 mx-auto mb-6 flex items-center justify-center">
              <Palette className="w-10 h-10" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 border-4 border-dashed border-gray-400 p-6 inline-block">
              Interior Design & Home Staging
            </h1>
            <div className="border-4 border-dashed border-gray-300 p-6 max-w-3xl mx-auto">
              <p className="text-xl text-gray-600">
                Transform your space with professional interior design and staging services led by our talented designer.
              </p>
            </div>
            <div className="mt-8 border-4 border-gray-800 px-8 py-4 inline-block">
              <span className="font-bold">SCHEDULE CONSULTATION →</span>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[BENEFITS SECTION]</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: Eye, text: "Increase Property Value" },
              { icon: Sparkles, text: "Stunning Spaces" },
              { icon: Ruler, text: "Space Efficiency" },
              { icon: PaintBucket, text: "Expert Color Selection" },
            ].map((benefit, i) => (
              <div key={i} className="border-4 border-gray-400 p-6 text-center bg-gray-50">
                <div className="wireframe-label mb-2">[BENEFIT {i + 1}]</div>
                <div className="w-16 h-16 border-4 border-gray-800 mx-auto mb-4 flex items-center justify-center">
                  <benefit.icon className="w-8 h-8" />
                </div>
                <p className="font-medium text-sm">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-20 bg-gray-50 border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[SERVICES SECTION]</div>
          <div className="text-center mb-16 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-xl text-gray-600">Comprehensive design and staging solutions</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[
              { title: "Interior Design", features: 6 },
              { title: "Home Staging", features: 6 },
            ].map((service, i) => (
              <div key={i} className="border-4 border-gray-400 p-8 bg-white">
                <div className="wireframe-label mb-4">[SERVICE {i + 1}]</div>
                <h3 className="text-3xl font-bold mb-4 border-b-2 border-gray-300 pb-2">{service.title}</h3>
                <div className="border-2 border-dashed border-gray-300 p-4 mb-6 bg-gray-50">
                  <div className="h-16" />
                  <p className="text-xs text-gray-500 mt-2">[Service description]</p>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: service.features }).map((_, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <div className="w-1.5 h-1.5 bg-gray-600 rounded-full mt-2" />
                      <span>Feature {idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-20 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[DESIGN PROCESS]</div>
          <div className="text-center mb-16 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Our Process</h2>
            <p className="text-xl text-gray-600">From concept to completion</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            {["01", "02", "03", "04", "05"].map((num, i) => (
              <div key={i} className="border-4 border-gray-400 p-6 bg-gray-50 relative">
                <div className="wireframe-label mb-2">[STEP {i + 1}]</div>
                <div className="text-6xl font-bold text-gray-300 mb-4">{num}</div>
                <h3 className="text-lg font-bold mb-2">Step Title</h3>
                <div className="border-2 border-dashed border-gray-300 p-2 bg-white">
                  <div className="h-12" />
                  <p className="text-xs text-gray-500 mt-1">[Description]</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Portfolio */}
      <section className="py-20 bg-gray-50 border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[PORTFOLIO GALLERY]</div>
          <div className="text-center mb-16 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Featured Projects</h2>
            <p className="text-xl text-gray-600">A glimpse into our recent successes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-4 border-gray-400 bg-white overflow-hidden">
                <div className="wireframe-label p-2">[PROJECT {i + 1}]</div>
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 relative border-t-4 border-gray-400">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Palette className="w-16 h-16 text-gray-400" />
                  </div>
                </div>
                <div className="p-6 border-t-4 border-gray-400">
                  <div className="text-sm text-gray-500 mb-2">[Category]</div>
                  <h3 className="text-xl font-bold mb-2">Project Title</h3>
                  <div className="border-2 border-dashed border-gray-300 p-2 bg-gray-50">
                    <p className="text-xs text-gray-500">[Description]</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <div className="border-4 border-gray-800 px-8 py-4 inline-block">
              <span className="font-bold">START YOUR DESIGN JOURNEY →</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-800 text-white border-b-8 border-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="wireframe-label text-gray-400 mb-8">[CALL TO ACTION]</div>
          <div className="border-4 border-dashed border-gray-600 p-12">
            <h2 className="text-4xl font-bold mb-6">
              Ready to Transform Your Space?
            </h2>
            <div className="border-4 border-white px-8 py-4 inline-block">
              <span className="font-bold">GET STARTED TODAY →</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
