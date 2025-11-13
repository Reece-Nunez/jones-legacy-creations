"use client";

import { WireframeNav } from "@/components/WireframeNav";
import { Mail, Phone, MapPin, Clock } from "lucide-react";

export default function WireframeContactPage() {
  return (
    <div className="bg-gray-100">
      <WireframeNav />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="wireframe-label mb-4">[CONTACT PAGE HERO]</div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 border-4 border-dashed border-gray-400 p-6 inline-block">
              Get In Touch
            </h1>
            <div className="border-4 border-dashed border-gray-300 p-6 max-w-3xl mx-auto">
              <p className="text-xl text-gray-600">
                Ready to start your next project? Have questions? We'd love to hear from you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-12 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[CONTACT INFO CARDS]</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Phone, title: "Phone", content: "(123) 456-7890" },
              { icon: Mail, title: "Email", content: "info@joneslegacy.com" },
              { icon: MapPin, title: "Location", content: "Your City, State" },
              { icon: Clock, title: "Hours", content: "Mon-Fri: 8AM-6PM" },
            ].map((info, i) => (
              <div key={i} className="border-4 border-gray-400 p-6 text-center bg-gray-50">
                <div className="wireframe-label mb-2">[INFO CARD {i + 1}]</div>
                <div className="w-12 h-12 border-4 border-gray-800 mx-auto mb-4 flex items-center justify-center">
                  <info.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold mb-2">{info.title}</h3>
                <p className="text-gray-600 text-sm">{info.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-20 bg-white border-b-8 border-gray-400">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[CONTACT FORM]</div>

          <div className="text-center mb-12 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Send Us a Message</h2>
            <p className="text-lg text-gray-600">
              Fill out the form below and we'll get back to you as soon as possible.
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {["Full Name *", "Email Address *"].map((field, i) => (
                <div key={i} className="border-4 border-gray-400 p-3 bg-gray-50">
                  <div className="text-xs font-bold mb-2 text-gray-600">{field}</div>
                  <div className="h-8 bg-white" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {["Phone Number *", "Subject *"].map((field, i) => (
                <div key={i} className="border-4 border-gray-400 p-3 bg-gray-50">
                  <div className="text-xs font-bold mb-2 text-gray-600">{field}</div>
                  <div className="h-8 bg-white" />
                </div>
              ))}
            </div>

            <div className="border-4 border-gray-400 p-3 bg-gray-50">
              <div className="text-xs font-bold mb-2 text-gray-600">Message *</div>
              <div className="h-32 bg-white" />
            </div>

            <div className="flex justify-center pt-4">
              <div className="border-4 border-gray-800 px-12 py-4 bg-white">
                <span className="font-bold text-lg">SEND MESSAGE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-20 bg-gray-50 border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[QUICK LINKS TO SERVICES]</div>

          <div className="text-center mb-12 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Or Get Started Directly</h2>
            <p className="text-lg text-gray-600">Jump straight to the service you need</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { title: "Real Estate Intake", desc: "Tell us about your dream home" },
              { title: "Construction Intake", desc: "Describe your construction project" },
              { title: "Design Consultation", desc: "Explore interior design services" },
            ].map((link, i) => (
              <div key={i} className="border-4 border-gray-400 p-8 bg-white hover:border-gray-800">
                <div className="wireframe-label mb-4">[SERVICE LINK {i + 1}]</div>
                <h3 className="text-2xl font-bold mb-3 border-b-2 border-gray-300 pb-2">
                  {link.title}
                </h3>
                <div className="border-2 border-dashed border-gray-300 p-3 bg-gray-50 mb-4">
                  <p className="text-gray-600 text-sm">{link.desc}</p>
                </div>
                <span className="text-sm font-bold underline">START FORM →</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
