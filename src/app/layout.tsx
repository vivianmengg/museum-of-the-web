import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Lora } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import { CurationProvider } from "@/components/CurationContext";
import CurationTray from "@/components/CurationTray";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
  title: "Museum of the Web",
  description: "A place where museum objects carry human memory.",
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
        <CurationProvider>
          <Nav />
          <main className="flex-1 pt-14">{children}</main>
          <footer className="py-12 text-center text-xs text-[var(--muted)] opacity-50">
            objects belong to their institutions. memories belong to you.
          </footer>
          <CurationTray />
        </CurationProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
