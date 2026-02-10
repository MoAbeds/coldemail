import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-400 mb-8 inline-block">
          &larr; Back to home
        </Link>

        <h1 className="text-2xl font-bold text-zinc-100 mb-2">Terms of Service</h1>
        <p className="text-sm text-zinc-500 mb-8">Last updated: February 2026</p>

        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">1. Acceptance of Terms</h2>
            <p>
              By accessing or using ColdClaude (&quot;the Service&quot;), you agree to be bound by
              these Terms of Service. If you do not agree to these terms, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">2. Description of Service</h2>
            <p>
              ColdClaude is a cold email automation platform that allows users to create and manage
              email outreach campaigns, track engagement, and manage leads. The Service includes
              email scheduling, sequence automation, reply detection, and analytics.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">3. Account Responsibilities</h2>
            <p>You are responsible for:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
              <li>Maintaining the security of your account credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Ensuring your email campaigns comply with applicable laws</li>
              <li>The accuracy of prospect data you upload to the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">4. Acceptable Use</h2>
            <p>You agree NOT to use the Service to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-400">
              <li>Send spam or unsolicited bulk email in violation of applicable laws</li>
              <li>Harvest or collect email addresses without consent</li>
              <li>Send emails containing malware, phishing, or fraudulent content</li>
              <li>Impersonate any person or entity</li>
              <li>Violate CAN-SPAM, GDPR, CASL, or other anti-spam regulations</li>
              <li>Exceed reasonable usage limits or abuse system resources</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">5. Email Compliance</h2>
            <p>
              You are solely responsible for ensuring your email campaigns comply with all applicable
              laws and regulations. The Service provides tools to assist with compliance (unsubscribe
              links, suppression lists, bounce handling), but compliance remains your responsibility.
              We reserve the right to suspend accounts that violate email sending regulations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">6. Connected Email Accounts</h2>
            <p>
              When you connect email accounts to the Service, you grant us permission to send emails
              on your behalf and access inbox data for reply detection. You retain ownership of your
              email accounts and can disconnect them at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">7. Data Ownership</h2>
            <p>
              You retain ownership of all data you upload to the platform, including prospect lists,
              email templates, and campaign content. We do not sell or share your data with third
              parties except as described in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">8. Service Availability</h2>
            <p>
              We strive to maintain high uptime but do not guarantee uninterrupted availability. We
              may perform maintenance or updates that temporarily affect the Service. We will
              provide reasonable notice for planned maintenance when possible.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">9. Limitation of Liability</h2>
            <p>
              The Service is provided &quot;as is&quot; without warranties of any kind. We are not
              liable for any indirect, incidental, or consequential damages arising from your use of
              the Service, including but not limited to email deliverability issues, data loss, or
              campaign performance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">10. Termination</h2>
            <p>
              We may suspend or terminate your account if you violate these terms. You may cancel
              your account at any time. Upon termination, your data will be retained for 30 days
              to allow for export, after which it will be permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">11. Contact</h2>
            <p>
              For questions about these terms, contact us at{" "}
              <span className="text-zinc-100">legal@coldclaude.com</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
