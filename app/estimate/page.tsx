import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import EstimateForm from "@/components/EstimateForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get a Free Estimate | Jones Legacy Creations",
  description:
    "Get an instant cost estimate for your construction, renovation, or interior design project in Southern Utah. Free, no obligation.",
  openGraph: {
    title: "Get a Free Estimate | Jones Legacy Creations",
    description:
      "Get an instant cost estimate for your construction, renovation, or interior design project in Southern Utah.",
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
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-500">
            Answer a few quick questions and get an instant cost range for your
            project. No commitment, no obligation.
          </p>
        </div>

        {/* Form */}
        <EstimateForm />
      </main>
      <Footer />
    </>
  );
}
