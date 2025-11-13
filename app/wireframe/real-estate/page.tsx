"use client";

import { WireframeNav } from "@/components/WireframeNav";
import { Home, MapPin, DollarSign, CheckCircle, Bed, Bath, Car } from "lucide-react";

export default function WireframeRealEstatePage() {
  return (
    <div className="bg-gray-100">
      <WireframeNav />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-white border-b-8 border-gray-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="wireframe-label mb-4">[SERVICE PAGE HERO]</div>
            <div className="w-20 h-20 border-4 border-gray-800 mx-auto mb-6 flex items-center justify-center">
              <Home className="w-10 h-10" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 border-4 border-dashed border-gray-400 p-6 inline-block">
              Real Estate Services
            </h1>
            <div className="border-4 border-dashed border-gray-300 p-6 max-w-3xl mx-auto">
              <p className="text-xl text-gray-600">
                Whether you're buying your dream home or selling your property, we provide expert guidance every step of the way.
              </p>
            </div>
          </div>

          <div className="wireframe-label text-center mb-4">[FEATURE HIGHLIGHTS]</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Home, text: "Expert Guidance" },
              { icon: MapPin, text: "Local Knowledge" },
              { icon: DollarSign, text: "Competitive Pricing" },
              { icon: CheckCircle, text: "Full Support" },
            ].map((feature, i) => (
              <div key={i} className="border-4 border-gray-400 p-4 text-center bg-white">
                <feature.icon className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm font-medium">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="wireframe-label text-center mb-8">[INTAKE FORM - SCROLLABLE]</div>

          <div className="text-center mb-12 border-4 border-dashed border-gray-300 p-8">
            <h2 className="text-4xl font-bold mb-4">Tell Us About Your Dream Home</h2>
            <p className="text-lg text-gray-600">
              Fill out this comprehensive form to help us understand exactly what you're looking for.
            </p>
          </div>

          {/* Form Sections Preview */}
          <div className="space-y-8">
            {/* Personal Info */}
            <div className="border-4 border-gray-400 p-6 bg-gray-50">
              <div className="wireframe-label mb-4">[FORM SECTION 1]</div>
              <h3 className="text-2xl font-bold mb-6 border-b-2 border-gray-400 pb-2">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {["Full Name *", "Email *", "Phone *"].map((field, i) => (
                  <div key={i} className="border-2 border-gray-400 p-3 bg-white">
                    <div className="text-xs font-bold mb-2 text-gray-600">{field}</div>
                    <div className="h-8 bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>

            {/* Service Type */}
            <div className="border-4 border-gray-400 p-6 bg-gray-50">
              <div className="wireframe-label mb-4">[FORM SECTION 2]</div>
              <h3 className="text-2xl font-bold mb-6 border-b-2 border-gray-400 pb-2">What Are You Looking For?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-gray-400 p-3 bg-white">
                  <div className="text-xs font-bold mb-2 text-gray-600">Service Type *</div>
                  <div className="h-8 bg-gray-100" />
                </div>
                <div className="border-2 border-gray-400 p-3 bg-white">
                  <div className="text-xs font-bold mb-2 text-gray-600">Property Type *</div>
                  <div className="h-8 bg-gray-100" />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="border-4 border-gray-400 p-6 bg-gray-50">
              <div className="wireframe-label mb-4">[FORM SECTION 3]</div>
              <h3 className="text-2xl font-bold mb-6 border-b-2 border-gray-400 pb-2 flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                Location Preferences
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {["City *", "Neighborhood", "State *", "Zip Code"].map((field, i) => (
                  <div key={i} className="border-2 border-gray-400 p-3 bg-white">
                    <div className="text-xs font-bold mb-2 text-gray-600">{field}</div>
                    <div className="h-8 bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div className="border-4 border-gray-400 p-6 bg-gray-50">
              <div className="wireframe-label mb-4">[FORM SECTION 4]</div>
              <h3 className="text-2xl font-bold mb-6 border-b-2 border-gray-400 pb-2 flex items-center gap-2">
                <DollarSign className="w-6 h-6" />
                Budget Range
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-gray-400 p-3 bg-white">
                  <div className="text-xs font-bold mb-2 text-gray-600">Min Budget *</div>
                  <div className="h-8 bg-gray-100" />
                </div>
                <div className="border-2 border-gray-400 p-3 bg-white">
                  <div className="text-xs font-bold mb-2 text-gray-600">Max Budget *</div>
                  <div className="h-8 bg-gray-100" />
                </div>
              </div>
            </div>

            {/* Property Features */}
            <div className="border-4 border-gray-400 p-6 bg-gray-50">
              <div className="wireframe-label mb-4">[FORM SECTION 5]</div>
              <h3 className="text-2xl font-bold mb-6 border-b-2 border-gray-400 pb-2 flex items-center gap-2">
                <Bed className="w-6 h-6" />
                Property Size & Layout
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {["Bedrooms *", "Bathrooms *", "Sq Footage", "Lot Size", "Year Built", "Stories"].map((field, i) => (
                  <div key={i} className="border-2 border-gray-400 p-3 bg-white">
                    <div className="text-xs font-bold mb-2 text-gray-600">{field}</div>
                    <div className="h-8 bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>

            {/* Garage */}
            <div className="border-4 border-gray-400 p-6 bg-gray-50">
              <div className="wireframe-label mb-4">[FORM SECTION 6]</div>
              <h3 className="text-2xl font-bold mb-6 border-b-2 border-gray-400 pb-2 flex items-center gap-2">
                <Car className="w-6 h-6" />
                Garage & Parking
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border-2 border-gray-400 p-3 bg-white">
                  <div className="text-xs font-bold mb-2 text-gray-600">Garage Spaces</div>
                  <div className="h-8 bg-gray-100" />
                </div>
                <div className="border-2 border-gray-400 p-3 bg-white">
                  <div className="text-xs font-bold mb-2 text-gray-600">Parking Type</div>
                  <div className="h-8 bg-gray-100" />
                </div>
              </div>
            </div>

            {/* Additional Sections Indicator */}
            <div className="border-4 border-dashed border-gray-300 p-8 text-center bg-white">
              <div className="wireframe-label mb-4">[ADDITIONAL FORM SECTIONS]</div>
              <div className="space-y-2 text-gray-600">
                <p>▪ Architectural Style</p>
                <p>▪ Interior Features (Kitchen, Flooring, Basement, Fireplace)</p>
                <p>▪ Exterior Features (Materials, Roof, Pool, Deck)</p>
                <p>▪ Systems & Utilities (HVAC, Smart Home, Solar)</p>
                <p>▪ Must-Have Features</p>
                <p>▪ Timeline</p>
                <p>▪ Additional Notes</p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center pt-6">
              <div className="border-4 border-gray-800 px-12 py-4 bg-white">
                <span className="font-bold text-lg">SUBMIT PROPERTY REQUEST</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
