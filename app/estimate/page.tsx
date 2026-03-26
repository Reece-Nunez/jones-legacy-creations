import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import EstimateForm from "@/components/EstimateForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get a Free Estimate | Jones Legacy Creations",
  description:
    "Get an instant cost estimate for your construction, renovation, or interior design project in Southern Utah. Free, no obligation, results in 60 seconds.",
  openGraph: {
    title: "Get a Free Estimate | Jones Legacy Creations",
    description:
      "Get an instant cost estimate for your construction, renovation, or interior design project in Southern Utah. Free, no obligation.",
  },
};

export default function EstimatePage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white pt-28">
        {/* Hero */}
        <div className="bg-gradient-to-b from-gray-50 to-white px-4 pb-4 pt-12 text-center sm:pt-16">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">
            Get Your Free Estimate
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Answer a few quick questions and get an instant cost range for your
            project. No commitment, no obligation.
          </p>
          <div className="mx-auto mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              Free
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              No obligation
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
              Get your estimate in 60 seconds
            </span>
          </div>
        </div>

        {/* Form */}
        <EstimateForm />
      </main>
      <Footer />
    </>
  );
}
