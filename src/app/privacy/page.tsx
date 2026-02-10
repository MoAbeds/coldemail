import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-400 mb-8 inline-block">
          &larr; Back to home
        </Link>

        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-500 mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">1. Information We Collect</h2>
            <p>
              We collect information you provide directly, including your name, email address, and
              account credentials for email services you connect. We also collect usage data such as
              campaign performance metrics, email engagement data, and application logs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
              <li>Provide, maintain, and improve our services</li>
              <li>Send emails on your behalf through connected email accounts</li>
              <li>Track email engagement (opens, clicks, replies) for your campaigns</li>
              <li>Generate analytics and reports on campaign performance</li>
              <li>Send service-related communications</li>
              <li>Detect, prevent, and address technical issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">3. Data Storage & Security</h2>
            <p>
              Your data is stored securely using industry-standard encryption. Email account
              credentials (SMTP passwords, OAuth tokens) are encrypted at rest using AES-256
              encryption. We use PostgreSQL for data storage with regular backups.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">4. Third-Party Services</h2>
            <p>
              We integrate with third-party services including email providers (Gmail, Outlook, SMTP),
              CRM platforms (HubSpot, Salesforce), and infrastructure providers (hosting, error
              tracking). Each integration only accesses data necessary for its function.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">5. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. Campaign data, email events,
              and analytics are retained for the duration of your subscription. You may request
              deletion of your data at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for data processing</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">7. Email Compliance</h2>
            <p>
              Our platform includes built-in compliance features: unsubscribe links in all outgoing
              emails, automatic suppression of unsubscribed contacts, bounce handling, and daily
              sending limits. Users are responsible for ensuring their email campaigns comply with
              CAN-SPAM, GDPR, and other applicable regulations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">8. Contact</h2>
            <p>
              For questions about this privacy policy or to exercise your data rights, contact us at{" "}
              <span className="text-zinc-100">privacy@coldclaude.com</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
