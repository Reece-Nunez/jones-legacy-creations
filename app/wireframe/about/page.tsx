"use client";

import { WireframeNav } from "@/components/WireframeNav";
import { Target, Users, Award, TrendingUp } from "lucide-react";

export default function WireframeAboutPage() {
  return (
    <div className="bg-gray-100">
      <WireframeNav />

      {/* Hero */}
      <section className="pt-32 pb-20 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="wireframe-label mb-4">[ABOUT PAGE HERO]</div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 border-4 border-dashed border-gray-400 p-6 inline-block">
              About Jones Legacy Creations
            </h1>
            <div className="border-4 border-dashed border-gray-300 p-6 max-w-3xl mx-auto mt-8">
              <p className="text-xl text-gray-600">
                For over 15 years, we've been dedicated to creating exceptional spaces and experiences through construction, real estate, and interior design.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-20 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label mb-8">[COMPANY STORY - 2 COLUMN LAYOUT]</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="border-4 border-gray-400 p-8">
              <div className="wireframe-label mb-4">[LEFT COLUMN - TEXT CONTENT]</div>
              <h2 className="text-4xl font-bold mb-6 border-b-4 border-gray-300 pb-4">Our Story</h2>
              <div className="space-y-4 text-gray-700">
                <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50">
                  <div className="h-20" />
                  <p className="text-sm text-gray-500 mt-2">[Paragraph 1: Company founding story]</p>
                </div>
                <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50">
                  <div className="h-20" />
                  <p className="text-sm text-gray-500 mt-2">[Paragraph 2: Evolution and growth]</p>
                </div>
                <div className="border-2 border-dashed border-gray-300 p-4 bg-gray-50">
                  <div className="h-20" />
                  <p className="text-sm text-gray-500 mt-2">[Paragraph 3: Current success]</p>
                </div>
              </div>
            </div>

            <div className="border-4 border-gray-400 p-8 bg-gray-50">
              <div className="wireframe-label mb-4">[RIGHT COLUMN - KEY POINTS]</div>
              <h3 className="text-2xl font-bold mb-6">Why Choose Us?</h3>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-start gap-3 border-2 border-gray-300 p-3">
                    <div className="w-2 h-2 bg-gray-600 rounded-full mt-2" />
                    <div className="flex-1">
                      <div className="font-bold mb-1">Benefit Title {i}</div>
                      <div className="text-sm text-gray-600">[Description text]</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-gray-50 border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[CORE VALUES SECTION]</div>
          <div className="text-center mb-16 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Our Core Values</h2>
            <p className="text-xl text-gray-600">The principles that guide our work every day</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Target, title: "Mission-Driven" },
              { icon: Users, title: "Client-Focused" },
              { icon: Award, title: "Quality First" },
              { icon: TrendingUp, title: "Growth-Oriented" },
            ].map((value, i) => (
              <div key={i} className="bg-white p-6 border-4 border-gray-400 text-center">
                <div className="wireframe-label mb-2">[VALUE CARD {i + 1}]</div>
                <div className="w-16 h-16 border-4 border-gray-800 mx-auto mb-4 flex items-center justify-center">
                  <value.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                <div className="border-2 border-dashed border-gray-300 p-3 bg-gray-50">
                  <div className="h-12" />
                  <p className="text-xs text-gray-500 mt-2">[Description]</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline Section */}
      <section className="py-20 bg-white border-b-8 border-gray-400">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[COMPANY TIMELINE]</div>
          <div className="text-center mb-16 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Our Journey</h2>
            <p className="text-xl text-gray-600">Milestones that shaped who we are today</p>
          </div>

          <div className="space-y-12">
            {[2008, 2012, 2015, 2020, 2024].map((year, i) => (
              <div key={year} className={`flex items-center ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
                <div className={`w-1/2 ${i % 2 === 0 ? "pr-12" : "pl-12"}`}>
                  <div className="border-4 border-gray-400 p-6 bg-gray-50">
                    <div className="wireframe-label mb-2">[MILESTONE {i + 1}]</div>
                    <div className="text-3xl font-bold mb-2">{year}</div>
                    <h3 className="text-xl font-bold mb-2">Major Event Title</h3>
                    <div className="border-2 border-dashed border-gray-300 p-3 bg-white">
                      <div className="h-12" />
                      <p className="text-xs text-gray-500 mt-2">[Event description]</p>
                    </div>
                  </div>
                </div>
                <div className="hidden md:block w-4 h-4 bg-gray-800 border-4 border-white absolute left-1/2 transform -translate-x-1/2" />
                <div className="w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gray-800 text-white border-b-8 border-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="wireframe-label text-gray-400 mb-8">[CALL TO ACTION]</div>
          <div className="border-4 border-dashed border-gray-600 p-12">
            <h2 className="text-4xl font-bold mb-6">
              Let's Build Something Amazing Together
            </h2>
            <div className="border-4 border-white px-8 py-4 inline-block">
              <span className="font-bold">CONTACT US</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
