import { Metadata } from "next";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Jones Legacy Creations",
  description: "Privacy policy for Jones Legacy Creations - how we collect, use, and protect your information.",
};

export default function PrivacyPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-bold text-black mb-8">Privacy Policy</h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-6">Last updated: January 2025</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-black mb-4">Information We Collect</h2>
              <p className="text-gray-700 mb-4">
                When you use our services or contact us through our website, we may collect the following information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Name and contact information (email address, phone number)</li>
                <li>Project details and preferences you provide in our forms</li>
                <li>Communication history between you and our team</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-black mb-4">How We Use Your Information</h2>
              <p className="text-gray-700 mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Respond to your inquiries and provide requested services</li>
                <li>Communicate with you about your projects</li>
                <li>Improve our services and website experience</li>
                <li>Send relevant updates about our services (with your consent)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-black mb-4">Information Sharing</h2>
              <p className="text-gray-700">
                We do not sell, trade, or otherwise transfer your personal information to outside parties.
                We may share information with trusted third parties who assist us in operating our website
                and conducting our business, so long as those parties agree to keep this information confidential.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-black mb-4">Data Security</h2>
              <p className="text-gray-700">
                We implement appropriate security measures to protect your personal information.
                However, no method of transmission over the Internet is 100% secure, and we cannot
                guarantee absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-black mb-4">Contact Us</h2>
              <p className="text-gray-700">
                If you have questions about this Privacy Policy, please contact us at:{" "}
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
