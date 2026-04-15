import { Metadata } from "next";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service & EULA | Jones Legacy Creations",
  description:
    "End-User License Agreement and Terms of Service for the Jones Legacy Creations project-management platform.",
};

export default function TermsPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-bold text-black mb-2">
            Terms of Service &amp; End-User License Agreement
          </h1>
          <p className="text-gray-500 mb-10">Effective Date: April 15, 2026 &nbsp;|&nbsp; Last Updated: April 15, 2026</p>

          <div className="prose prose-gray max-w-none space-y-10">

            {/* 1 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">1. Agreement to Terms</h2>
              <p className="text-gray-700">
                These Terms of Service and End-User License Agreement (&quot;Agreement&quot;) are a binding
                legal agreement between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and Jones Legacy
                Creations (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing or using the
                Jones Legacy Creations project-management platform (&quot;Platform&quot;), including any
                associated APIs, mobile interfaces, or integrations, you agree to be bound by
                this Agreement and our{" "}
                <a href="/privacy" className="text-black underline">Privacy Policy</a>, which is
                incorporated herein by reference.
              </p>
              <p className="text-gray-700 mt-3">
                <strong>If you do not agree to this Agreement, do not access or use the Platform.</strong>
              </p>
              <p className="text-gray-700 mt-3">
                The Platform is operated for internal business use by authorized staff and
                contractors of Jones Legacy Creations. Unauthorized access is strictly prohibited.
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">2. Description of the Platform</h2>
              <p className="text-gray-700 mb-3">
                The Platform is a proprietary construction project-management application that enables:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Management of construction projects, budgets, draw schedules, and progress tracking</li>
                <li>Contractor and subcontractor onboarding, including W-9 collection and direct-deposit enrollment</li>
                <li>Invoice upload, AI-assisted data extraction, and payment approval workflows</li>
                <li>Integration with Intuit QuickBooks Online for accounting synchronization, including vendor creation, bill generation, and ACH payment processing</li>
                <li>Document storage, lien waiver management, and financial reporting</li>
              </ul>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">3. License Grant</h2>
              <p className="text-gray-700">
                Subject to your compliance with this Agreement, Jones Legacy Creations grants you
                a limited, non-exclusive, non-transferable, non-sublicensable, revocable license
                to access and use the Platform solely for your authorized role in connection with
                Jones Legacy Creations business operations. This license does not include the right
                to: (a) copy, modify, or create derivative works of the Platform; (b) reverse
                engineer, decompile, or disassemble any component of the Platform; (c) sell,
                resell, sublicense, rent, or lease access to the Platform; or (d) access the
                Platform to build a competing product or service.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">4. Authorized Users</h2>
              <p className="text-gray-700 mb-3">
                Access to the Platform is restricted to individuals who have been granted explicit
                authorization by Jones Legacy Creations. Authorized users include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Company owners, officers, and administrative staff</li>
                <li>Contractors invited to submit invoices or enroll in direct deposit via a
                  time-limited, single-use token link</li>
              </ul>
              <p className="text-gray-700 mt-3">
                You are responsible for maintaining the confidentiality of your login credentials.
                You must notify us immediately at{" "}
                <a href="mailto:office@joneslegacycreations.com" className="text-black underline">
                  office@joneslegacycreations.com
                </a>{" "}
                if you suspect unauthorized access to your account. You are responsible for all
                activity that occurs under your account.
              </p>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">5. Prohibited Uses</h2>
              <p className="text-gray-700 mb-3">You agree not to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Use the Platform for any unlawful purpose or in violation of any applicable law or regulation</li>
                <li>Upload false, fraudulent, or misleading information, invoices, or documents</li>
                <li>Attempt to gain unauthorized access to any portion of the Platform, its infrastructure, or related systems</li>
                <li>Introduce malware, viruses, or other malicious code</li>
                <li>Scrape, harvest, or systematically collect data from the Platform without written authorization</li>
                <li>Interfere with or disrupt the integrity or performance of the Platform</li>
                <li>Impersonate any person or entity or misrepresent your affiliation</li>
                <li>Use the Platform to process payments for work not authorized by Jones Legacy Creations</li>
              </ul>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">6. QuickBooks Online Integration</h2>
              <p className="text-gray-700 mb-3">
                The Platform integrates with Intuit&apos;s QuickBooks Online API
                (&quot;QBO API&quot;) under Intuit&apos;s Developer Terms of Service. By using the QuickBooks
                integration features, you additionally agree to the following:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Authorized access only:</strong> The QBO connection must be authorized by
                  the lawful owner or administrator of the connected QuickBooks company. Connecting
                  a QBO account you do not have authority to administer is prohibited.
                </li>
                <li>
                  <strong>Data use restriction:</strong> QuickBooks data accessed through the QBO
                  API is used solely to operate Platform features (vendor sync, bill creation, payment
                  sync). It is not sold, shared with unauthorized parties, or used for any purpose
                  outside the Platform&apos;s core functionality.
                </li>
                <li>
                  <strong>No reverse engineering of QBO:</strong> You may not use the Platform to
                  attempt to reverse engineer, scrape, or extract proprietary QuickBooks data beyond
                  what the QBO API exposes.
                </li>
                <li>
                  <strong>Intuit terms:</strong> Your use of QuickBooks Online is separately governed
                  by Intuit&apos;s Terms of Service and Privacy Policy. Jones Legacy Creations is not
                  responsible for Intuit&apos;s services or any changes to the QBO API.
                </li>
                <li>
                  <strong>Developer liability:</strong> As the developer and operator of this
                  Platform, Jones Legacy Creations — not Intuit — is solely responsible for the
                  security of any QuickBooks data accessed through the Platform.
                </li>
              </ul>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">7. Sensitive Financial Data — W-9 &amp; Banking Information</h2>
              <p className="text-gray-700 mb-3">
                The Platform collects and processes sensitive financial information including Social
                Security Numbers (SSN), Employer Identification Numbers (EIN), and bank account
                details. By submitting this information through the Platform, you:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  Represent that you are authorized to provide such information and that it is
                  accurate and current
                </li>
                <li>
                  Consent to its use for the specific purpose stated (1099 tax reporting for SSN/EIN;
                  ACH payment processing for banking details)
                </li>
                <li>
                  Acknowledge that this information is encrypted at rest and in transit, and
                  accessible only to authorized Jones Legacy Creations personnel on a need-to-know
                  basis
                </li>
                <li>
                  Understand that SSN/EIN information may be reported to the IRS as required by
                  federal tax law (Form 1099-NEC)
                </li>
              </ul>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">8. Intellectual Property</h2>
              <p className="text-gray-700">
                The Platform, including its software, design, text, graphics, interfaces, and all
                underlying technology, is the exclusive property of Jones Legacy Creations and its
                licensors, and is protected by U.S. and international copyright, trademark, patent,
                and trade secret laws. Nothing in this Agreement transfers any ownership rights to
                you. The Jones Legacy Creations name, logo, and brand marks are proprietary and
                may not be used without our prior written consent.
              </p>
              <p className="text-gray-700 mt-3">
                <strong>Your data:</strong> You retain ownership of all data, documents, and content
                you upload to the Platform (&quot;User Content&quot;). You grant Jones Legacy Creations a
                limited license to store, process, and display User Content solely to operate the
                Platform and provide the services described herein.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">9. Confidentiality</h2>
              <p className="text-gray-700">
                The Platform contains proprietary and confidential information. You agree to treat
                all non-public information accessed through the Platform — including project
                financials, contractor payment records, and business operations — as confidential,
                and not to disclose it to any third party without prior written authorization from
                Jones Legacy Creations.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">10. Availability &amp; Modifications</h2>
              <p className="text-gray-700">
                We will make reasonable efforts to keep the Platform available, but we do not
                guarantee uninterrupted access. We reserve the right to modify, suspend, or
                discontinue any feature or the Platform itself at any time, with or without notice.
                We may also update this Agreement at any time; material changes will be communicated
                via email to registered users at least 14 days before taking effect. Your continued
                use of the Platform after the effective date constitutes acceptance of the updated
                terms.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">11. Disclaimer of Warranties</h2>
              <p className="text-gray-700">
                THE PLATFORM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY
                KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
                MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO
                NOT WARRANT THAT THE PLATFORM WILL BE ERROR-FREE, SECURE, OR UNINTERRUPTED, OR
                THAT DEFECTS WILL BE CORRECTED. AI-GENERATED DOCUMENT ANALYSIS IS PROVIDED FOR
                INFORMATIONAL PURPOSES ONLY AND MAY CONTAIN ERRORS; YOU ARE RESPONSIBLE FOR
                VERIFYING ALL AI-EXTRACTED DATA BEFORE ACTING ON IT.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">12. Limitation of Liability</h2>
              <p className="text-gray-700">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL JONES LEGACY
                CREATIONS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
                PUNITIVE DAMAGES — INCLUDING LOSS OF PROFITS, DATA, BUSINESS, OR GOODWILL —
                ARISING FROM YOUR USE OF OR INABILITY TO USE THE PLATFORM, EVEN IF WE HAVE BEEN
                ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY TO YOU FOR ANY
                CLAIM ARISING FROM THIS AGREEMENT OR YOUR USE OF THE PLATFORM WILL NOT EXCEED
                THE GREATER OF ONE HUNDRED U.S. DOLLARS ($100) OR THE AMOUNT PAID BY YOU TO US
                IN THE 12 MONTHS PRECEDING THE CLAIM.
              </p>
              <p className="text-gray-700 mt-3">
                Some jurisdictions do not allow exclusion of implied warranties or limitation of
                liability for incidental or consequential damages, so the above limitations may
                not apply to you in full.
              </p>
            </section>

            {/* 13 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">13. Indemnification</h2>
              <p className="text-gray-700">
                You agree to indemnify, defend, and hold harmless Jones Legacy Creations and its
                officers, directors, employees, and agents from and against any claims, liabilities,
                damages, losses, and expenses (including reasonable attorneys&apos; fees) arising from:
                (a) your violation of this Agreement; (b) your use of the Platform in a manner not
                authorized herein; (c) your violation of any applicable law or regulation; or
                (d) any User Content you submit that infringes a third party&apos;s rights.
              </p>
            </section>

            {/* 14 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">14. Termination</h2>
              <p className="text-gray-700">
                Jones Legacy Creations may suspend or terminate your access to the Platform at
                any time, with or without cause and with or without notice, including for violation
                of this Agreement. Upon termination, your license to use the Platform immediately
                ceases. Provisions of this Agreement that by their nature should survive termination
                — including Sections 8 (Intellectual Property), 9 (Confidentiality), 11 (Disclaimer
                of Warranties), 12 (Limitation of Liability), 13 (Indemnification), and 15
                (Governing Law) — will survive.
              </p>
            </section>

            {/* 15 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">15. Governing Law &amp; Dispute Resolution</h2>
              <p className="text-gray-700">
                This Agreement is governed by the laws of the State of Utah, United States, without
                regard to its conflict-of-law principles. Any dispute arising from or relating to
                this Agreement or the Platform that cannot be resolved informally will be submitted
                to binding arbitration under the rules of the American Arbitration Association
                (&quot;AAA&quot;), conducted in Washington County, Utah. Notwithstanding the foregoing,
                either party may seek injunctive or other equitable relief in any court of competent
                jurisdiction to prevent irreparable harm. You waive any right to participate in a
                class-action lawsuit or class-wide arbitration.
              </p>
            </section>

            {/* 16 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">16. Accessibility</h2>
              <p className="text-gray-700">
                We are committed to making the Platform and our public website accessible to all
                users, including those with disabilities, and target conformance with WCAG 2.1
                Level AA. If you experience an accessibility barrier, please contact us at{" "}
                <a href="mailto:office@joneslegacycreations.com" className="text-black underline">
                  office@joneslegacycreations.com
                </a>{" "}
                with &quot;Accessibility&quot; in the subject line, and we will make reasonable efforts
                to resolve the issue promptly.
              </p>
            </section>

            {/* 17 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">17. Miscellaneous</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Entire Agreement:</strong> This Agreement and the Privacy Policy constitute
                  the entire agreement between you and Jones Legacy Creations regarding the Platform
                  and supersede all prior agreements.
                </li>
                <li>
                  <strong>Severability:</strong> If any provision of this Agreement is found invalid
                  or unenforceable, that provision will be modified to the minimum extent necessary
                  to make it enforceable, and the remaining provisions will continue in full force.
                </li>
                <li>
                  <strong>No waiver:</strong> Our failure to enforce any right or provision of this
                  Agreement will not constitute a waiver of that right or provision.
                </li>
                <li>
                  <strong>Assignment:</strong> You may not assign this Agreement or any rights
                  hereunder without our prior written consent. We may assign this Agreement in
                  connection with a merger, acquisition, or sale of all or substantially all of
                  our assets.
                </li>
                <li>
                  <strong>Export compliance:</strong> You represent that you are not located in a
                  country subject to U.S. government embargo and that you are not on any U.S.
                  government restricted-party list.
                </li>
              </ul>
            </section>

            {/* 18 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">18. Contact Us</h2>
              <p className="text-gray-700">
                For questions about this Agreement:
              </p>
              <address className="not-italic text-gray-700 mt-3 space-y-1">
                <p><strong>Jones Legacy Creations</strong></p>
                <p>Southern Utah, USA</p>
                <p>
                  Email:{" "}
                  <a href="mailto:office@joneslegacycreations.com" className="text-black underline">
                    office@joneslegacycreations.com
                  </a>
                </p>
              </address>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
