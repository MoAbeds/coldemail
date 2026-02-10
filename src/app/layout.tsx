import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import AuthSessionProvider from "@/components/providers/session-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#09090b",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
  title: {
    default: "ColdClaude - Cold Email Automation",
    template: "%s | ColdClaude",
  },
  description:
    "Automate cold email outreach with smart sequences, reply detection, and lead scoring. Built for sales teams that move fast.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ColdClaude",
  },
  openGraph: {
    type: "website",
    siteName: "ColdClaude",
    title: "ColdClaude - Cold Email Automation",
    description:
      "Automate cold email outreach with smart sequences, reply detection, and lead scoring.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "ColdClaude - Cold Email Automation",
    description:
      "Automate cold email outreach with smart sequences, reply detection, and lead scoring.",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
