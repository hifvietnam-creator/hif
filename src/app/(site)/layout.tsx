import type { Metadata } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RevealObserver from "@/components/RevealObserver";
import { Analytics } from "@vercel/analytics/next";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hanoi International Fellowship",
  description:
    "An international church in Hanoi — welcoming people from 100+ nations for over 30 years. Join us for Sunday worship at three locations.",
  keywords: ["church", "Hanoi", "international", "fellowship", "HIF", "expat", "Vietnam"],
  openGraph: {
    title: "Hanoi International Fellowship",
    description:
      "An international church in Hanoi — welcoming people from 100+ nations for over 30 years.",
    url: "https://hif.vn",
    siteName: "HIF",
    locale: "en_US",
    type: "website",
  },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bricolage.variable} ${inter.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <Header />
        <RevealObserver />
        <main id="main-content">{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
