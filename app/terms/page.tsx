import { Metadata } from "next";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service | Jones Legacy Creations",
  description: "Terms of service for Jones Legacy Creations website and services.",
};

export default function TermsPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-bold text-black mb-8">Terms of Service</h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">Last updated: January 2025</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-black mb-4">Agreement to Terms</h2>
              <p className="text-gray-700">
                By accessing or using the Jones Legacy Creations website, you agree to be bound by these
                Terms of Service. If you do not agree to these terms, please do not use our website.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-black mb-4">Services</h2>
              <p className="text-gray-700">
                Jones Legacy Creations provides construction, real estate, and interior design services
                in Southern Utah. All services are subject to separate agreements and contracts as
                applicable to specific projects.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-black mb-4">Website Use</h2>
              <p className="text-gray-700 mb-4">When using our website, you agree to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Provide accurate information in any forms you submit</li>
                <li>Use the website only for lawful purposes</li>
                <li>Not attempt to interfere with the proper functioning of the website</li>
                <li>Not collect or harvest any information from the website without authorization</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-black mb-4">Intellectual Property</h2>
              <p className="text-gray-700">
                All content on this website, including text, images, logos, and design elements,
                is the property of Jones Legacy Creations and is protected by applicable intellectual
                property laws. You may not reproduce, distribute, or use any content without our
                written permission.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-black mb-4">Limitation of Liability</h2>
              <p className="text-gray-700">
                Jones Legacy Creations shall not be liable for any indirect, incidental, special,
                or consequential damages arising from your use of this website. This website is
                provided &quot;as is&quot; without warranties of any kind.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-black mb-4">Changes to Terms</h2>
              <p className="text-gray-700">
                We reserve the right to modify these Terms of Service at any time. Changes will be
                effective immediately upon posting to the website. Your continued use of the website
                constitutes acceptance of any modified terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-black mb-4">Contact Us</h2>
              <p className="text-gray-700">
                If you have questions about these Terms of Service, please contact us at:{" "}
                <a href="mailto:office@joneslegacycreations.com" className="text-black underline">
                  office@joneslegacycreations.com
                </a>
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
