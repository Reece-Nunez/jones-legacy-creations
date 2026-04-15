import { Metadata } from "next";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | Jones Legacy Creations",
  description:
    "Privacy Policy for Jones Legacy Creations — how we collect, use, store, and protect your personal and financial information.",
};

export default function PrivacyPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-4xl font-bold text-black mb-2">Privacy Policy</h1>
          <p className="text-gray-500 mb-10">Effective Date: April 15, 2026 &nbsp;|&nbsp; Last Updated: April 15, 2026</p>

          <div className="prose prose-gray max-w-none space-y-10">

            {/* 1 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">1. Who We Are</h2>
              <p className="text-gray-700">
                Jones Legacy Creations (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is a licensed general
                contractor headquartered in Southern Utah. We operate a proprietary project-management
                platform (&quot;Platform&quot;) that our authorized staff use to manage construction projects,
                process contractor payments, and integrate with QuickBooks Online (&quot;QBO&quot;) for
                accounting purposes.
              </p>
              <p className="text-gray-700 mt-3">
                This Privacy Policy explains how we collect, use, disclose, and safeguard personal
                information in connection with the Platform and our public website
                (joneslegacycreations.com).
              </p>
              <p className="text-gray-700 mt-3">
                <strong>Contact:</strong>{" "}
                <a href="mailto:office@joneslegacycreations.com" className="text-black underline">
                  office@joneslegacycreations.com
                </a>
              </p>
            </section>

            {/* 2 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">2. Information We Collect</h2>

              <h3 className="text-lg font-semibold text-black mb-2">2.1 Account &amp; Staff Information</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Name, email address, and hashed password (via Supabase Auth)</li>
                <li>Role and permission level within the Platform</li>
                <li>IP address and session metadata for security logging</li>
              </ul>

              <h3 className="text-lg font-semibold text-black mb-2 mt-5">2.2 Contractor Data</h3>
              <p className="text-gray-700 mb-2">
                Our staff enters contractor records into the Platform. This may include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Legal name, business/company name</li>
                <li>Email address, phone number, and mailing address</li>
                <li>
                  <strong>Tax identification numbers</strong> — Federal EIN or individual SSN, collected
                  via W-9 forms uploaded to the Platform. This is sensitive personal information.
                </li>
                <li>
                  <strong>Bank account details</strong> — ABA routing number and bank account number,
                  collected for ACH direct-deposit payment processing. This is sensitive financial
                  information.
                </li>
                <li>Classification (subcontractor, vendor, employee) and 1099 eligibility status</li>
              </ul>

              <h3 className="text-lg font-semibold text-black mb-2 mt-5">2.3 Project &amp; Financial Data</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Project names, addresses, budgets, draw schedules, and progress records</li>
                <li>Invoices, receipts, and other financial documents uploaded to the Platform</li>
                <li>Payment amounts, dates, and descriptions</li>
                <li>AI-assisted categorizations generated from uploaded documents</li>
              </ul>

              <h3 className="text-lg font-semibold text-black mb-2 mt-5">2.4 QuickBooks Online Data</h3>
              <p className="text-gray-700">
                When a QBO connection is authorized, we access and write data through the Intuit
                QuickBooks Online API, including vendor records, bills, and bill payments. We access
                only the data necessary to operate the Platform&apos;s accounting sync features. We do
                not store raw QBO credentials; instead, we store OAuth 2.0 tokens provided by Intuit.
              </p>

              <h3 className="text-lg font-semibold text-black mb-2 mt-5">2.5 Website &amp; Technical Data</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Browser type, operating system, referring URL, and pages visited</li>
                <li>IP address and approximate geographic location (country/state)</li>
                <li>Cookies and similar session identifiers (see Section 8)</li>
              </ul>

              <h3 className="text-lg font-semibold text-black mb-2 mt-5">2.6 Communications</h3>
              <p className="text-gray-700">
                If you contact us via email, contact form, or other means, we retain those
                communications for customer-service and legal purposes.
              </p>
            </section>

            {/* 3 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">3. How We Use Your Information</h2>
              <p className="text-gray-700 mb-3">We use the information described above to:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Operate, maintain, and improve the Platform and website</li>
                <li>Authenticate and authorize users</li>
                <li>Create and manage contractor vendor records in QuickBooks Online</li>
                <li>Process contractor payments via ACH bank transfer through QBO</li>
                <li>Send direct-deposit enrollment invitations to contractors</li>
                <li>AI-analyze uploaded invoices and documents for categorization and data extraction</li>
                <li>Generate draw requests, lien waivers, and financial reports</li>
                <li>Comply with applicable tax-reporting obligations (1099 issuance)</li>
                <li>Detect, investigate, and prevent fraudulent or unauthorized activity</li>
                <li>Respond to legal requests and enforce our Terms of Service</li>
              </ul>
              <p className="text-gray-700 mt-4">
                <strong>We do not sell personal information to third parties. We do not use personal
                information for advertising or marketing profiling.</strong> QuickBooks data accessed
                through the Intuit API is used exclusively to power the Platform&apos;s accounting
                integration and is not shared with any party other than as described in Section 5.
              </p>
            </section>

            {/* 4 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">4. Legal Basis for Processing (GDPR)</h2>
              <p className="text-gray-700 mb-3">
                For users in the European Economic Area (EEA) or United Kingdom, our legal bases for
                processing personal data are:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Contract performance</strong> — processing necessary to provide the services
                  described in our Terms of Service
                </li>
                <li>
                  <strong>Legitimate interests</strong> — security monitoring, fraud prevention, and
                  platform improvement, where those interests are not overridden by your rights
                </li>
                <li>
                  <strong>Legal obligation</strong> — compliance with applicable tax law (e.g., 1099
                  reporting), financial regulations, and court orders
                </li>
                <li>
                  <strong>Consent</strong> — where we have specifically requested it (e.g., marketing
                  communications)
                </li>
              </ul>
            </section>

            {/* 5 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">5. Information Sharing &amp; Subprocessors</h2>
              <p className="text-gray-700 mb-4">
                We share personal information only with the service providers necessary to operate the
                Platform (&quot;Subprocessors&quot;) and as required by law. Each Subprocessor is contractually
                required to protect personal information to at least the same standard we apply.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-gray-700 border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 border border-gray-200 font-semibold">Subprocessor</th>
                      <th className="text-left p-3 border border-gray-200 font-semibold">Purpose</th>
                      <th className="text-left p-3 border border-gray-200 font-semibold">Data Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-3 border border-gray-200">Supabase, Inc.</td>
                      <td className="p-3 border border-gray-200">Database hosting, authentication, and file storage</td>
                      <td className="p-3 border border-gray-200">United States (AWS us-east-1)</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-3 border border-gray-200">Vercel, Inc.</td>
                      <td className="p-3 border border-gray-200">Web application hosting and edge infrastructure</td>
                      <td className="p-3 border border-gray-200">United States / Global edge</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-gray-200">Resend, Inc.</td>
                      <td className="p-3 border border-gray-200">Transactional email delivery (invitations, notifications)</td>
                      <td className="p-3 border border-gray-200">United States</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="p-3 border border-gray-200">Intuit Inc. (QuickBooks Online)</td>
                      <td className="p-3 border border-gray-200">Accounting integration — vendor, bill, and payment sync</td>
                      <td className="p-3 border border-gray-200">United States</td>
                    </tr>
                    <tr>
                      <td className="p-3 border border-gray-200">Anthropic, PBC</td>
                      <td className="p-3 border border-gray-200">AI-assisted document analysis and invoice data extraction</td>
                      <td className="p-3 border border-gray-200">United States</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-gray-700 mt-4">
                We may also disclose personal information: (a) to comply with applicable law, court
                order, or governmental regulation; (b) to enforce our Terms of Service; (c) to protect
                the rights, property, or safety of Jones Legacy Creations, our users, or the public;
                or (d) in connection with a merger, acquisition, or sale of business assets, in which
                case the successor entity will be bound by this Privacy Policy.
              </p>
            </section>

            {/* 6 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">6. Sensitive Data Handling</h2>
              <p className="text-gray-700 mb-3">
                Certain categories of data we handle are classified as sensitive under applicable law:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Tax Identification Numbers (SSN / EIN):</strong> Collected from W-9 forms
                  submitted by contractors. Stored encrypted at rest in Supabase. Accessed only by
                  authorized staff with a legitimate business need. Transmitted only to QBO for
                  1099 reporting purposes.
                </li>
                <li>
                  <strong>Bank Account Numbers:</strong> Collected for ACH direct-deposit setup.
                  Stored encrypted at rest. Transmitted to QBO over TLS. We never log or display
                  full account numbers beyond the masked last-4 digits in the Platform UI after
                  initial entry.
                </li>
              </ul>
              <p className="text-gray-700 mt-3">
                Access to sensitive data is restricted to authenticated, authorized staff on a
                need-to-know basis. All access is logged for audit purposes.
              </p>
            </section>

            {/* 7 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">7. Data Retention</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Project and financial records</strong> — retained for a minimum of 7 years
                  from project close to comply with IRS record-keeping requirements and applicable
                  state contractor regulations.
                </li>
                <li>
                  <strong>W-9 / tax documents</strong> — retained for a minimum of 4 years following
                  the tax year of filing, consistent with IRS guidelines for 1099 issuance.
                </li>
                <li>
                  <strong>Contractor records</strong> — retained while the contractor relationship is
                  active and for 7 years thereafter.
                </li>
                <li>
                  <strong>Staff account data</strong> — retained for the duration of employment plus
                  2 years, unless a longer retention period is required by law.
                </li>
                <li>
                  <strong>Website analytics / logs</strong> — retained for 90 days, then purged.
                </li>
              </ul>
              <p className="text-gray-700 mt-3">
                When data is deleted, we remove it from active systems within 30 days. Backup copies
                may persist for up to 90 additional days before being overwritten.
              </p>
            </section>

            {/* 8 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">8. Cookies &amp; Tracking Technologies</h2>
              <p className="text-gray-700 mb-3">
                Our public website and Platform use the following types of cookies and similar
                technologies:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Strictly necessary cookies</strong> — Session authentication cookies set
                  by Supabase Auth to keep you logged in. These are required for the Platform to
                  function and cannot be disabled.
                </li>
                <li>
                  <strong>Functional cookies</strong> — Preferences such as theme (light/dark mode)
                  and UI state stored in localStorage or sessionStorage. These are not transmitted
                  to any third party.
                </li>
                <li>
                  <strong>Analytics</strong> — We do not currently use third-party analytics trackers
                  (e.g., Google Analytics) on the Platform or public website.
                </li>
              </ul>
              <p className="text-gray-700 mt-3">
                Because we use only strictly necessary and functional cookies, a cookie consent banner
                is not required under the EU ePrivacy Directive for our current implementation.
                Should we add analytics or marketing cookies in the future, we will obtain consent
                prior to setting those cookies.
              </p>
              <p className="text-gray-700 mt-3">
                You may clear cookies at any time through your browser settings. Note that clearing
                authentication cookies will log you out of the Platform.
              </p>
            </section>

            {/* 9 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">9. Security</h2>
              <p className="text-gray-700 mb-3">
                We implement administrative, technical, and physical safeguards appropriate to the
                sensitivity of the data we process, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>TLS 1.2+ encryption for all data in transit</li>
                <li>AES-256 encryption for data at rest (Supabase / AWS)</li>
                <li>Role-based access control (RBAC) limiting data access to authorized staff</li>
                <li>Row-Level Security (RLS) policies enforced at the database layer</li>
                <li>HMAC-SHA256 verification of all incoming QuickBooks webhook events</li>
                <li>Multi-factor authentication available for staff accounts</li>
                <li>Automated secret rotation for API credentials</li>
                <li>Activity logging for sensitive data access and payment operations</li>
              </ul>
              <p className="text-gray-700 mt-3">
                In the event of a data breach involving your personal information, we will notify
                affected individuals and, where required, regulatory authorities within 72 hours
                of becoming aware of the breach, as required by the GDPR and applicable U.S. state
                laws.
              </p>
              <p className="text-gray-700 mt-3">
                Despite these measures, no system is 100% secure. If you believe your account or
                information has been compromised, contact us immediately at{" "}
                <a href="mailto:office@joneslegacycreations.com" className="text-black underline">
                  office@joneslegacycreations.com
                </a>.
              </p>
            </section>

            {/* 10 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">10. Your Privacy Rights</h2>
              <p className="text-gray-700 mb-3">
                Depending on your location, you may have the following rights regarding your personal
                information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  <strong>Right to access</strong> — Request a copy of the personal data we hold
                  about you.
                </li>
                <li>
                  <strong>Right to correction</strong> — Request correction of inaccurate or
                  incomplete data.
                </li>
                <li>
                  <strong>Right to deletion</strong> — Request deletion of your personal data,
                  subject to our legal retention obligations.
                </li>
                <li>
                  <strong>Right to data portability</strong> — Receive your data in a structured,
                  machine-readable format (GDPR / CCPA).
                </li>
                <li>
                  <strong>Right to restrict processing</strong> — Request that we limit how we use
                  your data in certain circumstances.
                </li>
                <li>
                  <strong>Right to object</strong> — Object to processing based on legitimate
                  interests.
                </li>
                <li>
                  <strong>Right to opt out of sale / sharing</strong> — We do not sell or share
                  personal information for cross-context behavioral advertising, so this right does
                  not apply; however, you may contact us to confirm.
                </li>
              </ul>
              <p className="text-gray-700 mt-3">
                Utah residents: The Utah Consumer Privacy Act (UCPA) provides rights to access,
                deletion, portability, and opt-out of sale of personal data. To exercise these
                rights, please submit a request to{" "}
                <a href="mailto:office@joneslegacycreations.com" className="text-black underline">
                  office@joneslegacycreations.com
                </a>{" "}
                with &quot;Privacy Request&quot; in the subject line. We will respond within 45 days.
                California residents may also submit requests under CCPA/CPRA.
              </p>
              <p className="text-gray-700 mt-3">
                Note: Certain personal information is retained by law (e.g., IRS records) and cannot
                be deleted upon request. We will explain any such limitations when we respond to
                your request.
              </p>
            </section>

            {/* 11 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">11. Children&apos;s Privacy</h2>
              <p className="text-gray-700">
                The Platform is intended solely for use by authorized business personnel and
                contractors age 18 and older. We do not knowingly collect personal information
                from children under 13. If we become aware that we have inadvertently collected
                information from a child under 13, we will promptly delete it.
              </p>
            </section>

            {/* 12 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">12. Accessibility</h2>
              <p className="text-gray-700">
                We are committed to making our website and Platform accessible to all users,
                including those with disabilities. We target conformance with the Web Content
                Accessibility Guidelines (WCAG) 2.1 Level AA. If you encounter an accessibility
                barrier, please contact us at{" "}
                <a href="mailto:office@joneslegacycreations.com" className="text-black underline">
                  office@joneslegacycreations.com
                </a>{" "}
                and we will work to resolve it promptly.
              </p>
            </section>

            {/* 13 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">13. Changes to This Policy</h2>
              <p className="text-gray-700">
                We may update this Privacy Policy to reflect changes to our practices, legal
                requirements, or services. Material changes will be communicated via email to
                registered Platform users at least 14 days before taking effect. The &quot;Last
                Updated&quot; date at the top of this page reflects the most recent revision.
                Continued use of the Platform after the effective date constitutes acceptance
                of the updated policy.
              </p>
            </section>

            {/* 14 */}
            <section>
              <h2 className="text-2xl font-semibold text-black mb-3">14. Contact Us</h2>
              <p className="text-gray-700">
                For privacy-related questions, requests, or concerns:
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
