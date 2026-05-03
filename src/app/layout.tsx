import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Lora } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { CurationProvider } from "@/components/CurationContext";
import CurationTray from "@/components/CurationTray";
import { ToastProvider } from "@/components/Toast";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import FaviconRotator from "@/components/FaviconRotator";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Patina",
  description: "9,000+ years of human creativity in one place.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--background)] text-[var(--foreground)]">
        <ToastProvider>
          <CurationProvider>
            <Nav />
            <main className="flex-1 pt-14 pb-20 sm:pb-0">{children}</main>
            <Footer />
            <CurationTray />
          </CurationProvider>
        </ToastProvider>
        <FaviconRotator />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
