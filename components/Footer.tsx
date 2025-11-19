import Link from "next/link";
import Image from "next/image";
import { Building2, Home, Palette, Mail, Phone, MapPin, Instagram, Facebook } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Company Info */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/jones-legacy-creations-logo-black.svg"
                alt="Jones Legacy Creations"
                width={504}
                height={360}
                className="h-32 w-auto"
              />
            </Link>
            <p className="text-gray-400 mb-6">
              Building legacies through exceptional construction, real estate, and interior design services.
            </p>
            <div className="flex flex-col space-y-3 text-sm text-gray-400">
              <a href="tel:+14352889807" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-4 h-4" />
                <span>(435) 288-9807</span>
              </a>
              <a href="mailto:office@joneslegacycreations.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
                <span>office@joneslegacycreations.com</span>
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>Hurricane, Utah</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-6">Serving all of Southern Utah</p>
            </div>
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3">Follow Us</h4>
              <div className="flex flex-col space-y-2 text-sm">
                <a
                  href="https://www.instagram.com/jonescustomhomes/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                  <span>Custom Homes</span>
                </a>
                <a
                  href="https://www.instagram.com/interiors.by.jch/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                  <span>Interior Design</span>
                </a>
                <a
                  href="https://www.facebook.com/profile.php?id=61575767564467"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                  <span>Interior Design</span>
                </a>
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/services/real-estate"
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Real Estate
                </Link>
              </li>
              <li>
                <Link
                  href="/services/construction"
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  Construction
                </Link>
              </li>
              <li>
                <Link
                  href="/services/interior-design"
                  className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Palette className="w-4 h-4" />
                  Interior Design & Staging
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/about"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/partners"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Our Partners
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Get Started */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Get Started</h4>
            <p className="text-gray-400 text-sm mb-4">
              Ready to begin your next project? Let us know what you need.
            </p>
            <Link
              href="/contact"
              className="inline-block px-6 py-3 bg-white text-black text-sm font-medium rounded-full hover:bg-gray-200 transition-colors"
            >
              Start a Project
            </Link>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              &copy; {currentYear} Jones Legacy Creations. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
