// src/app/layout.tsx
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SessionProviderWrapper from "@/components/providers/SessionProviderWrapper";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "PriceStory – Track Prices & Save Money",
    template: "%s | PriceStory",
  },
  description:
    "Track Amazon & Flipkart product prices, get alerts on drops, and save money. PriceStory helps you never miss a deal.",
  keywords: [
    "Price tracker",
    "Amazon price history",
    "Flipkart deals",
    "price alerts",
    "online shopping discounts",
  ],
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://pricestory.vercel.app"
  ),
  openGraph: {
    type: "website",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://pricestory.vercel.app",
    title: "PriceStory – Track Prices & Save Money",
    description:
      "Track Amazon & Flipkart product prices, get alerts on drops, and save money.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "PriceStory",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PriceStory – Track Prices & Save Money",
    description:
      "Track Amazon & Flipkart product prices, get alerts on drops, and save money.",
    images: ["/og-default.png"],
  },
  alternates: {
    canonical:
      process.env.NEXT_PUBLIC_SITE_URL || "https://pricestory.vercel.app",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://pricestory.vercel.app";

  return (
    <html lang="en">
      <head>
        {/* JSON-LD for Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "PriceStory",
              url: baseUrl,
              logo: `${baseUrl}/og-default.png`,
              sameAs: [
                "https://twitter.com/", // update later
                "https://www.facebook.com/", // update later
              ],
            }),
          }}
        />
        {/* JSON-LD for Website */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "PriceStory",
              url: baseUrl,
              potentialAction: {
                "@type": "SearchAction",
                target: `${baseUrl}/search?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body className="antialiased bg-white text-slate-900">
        <SessionProviderWrapper>
          <Header />
          <main>{children}</main>
          <Footer />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
