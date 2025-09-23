// src/app/about/page.tsx
import type { Metadata } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pricestory.vercel.app";

export const metadata: Metadata = {
  title: "About • PriceStory — Price tracker for Amazon & Flipkart",
  description:
    "PriceStory tracks product prices across Amazon & Flipkart and alerts you to drops. Learn how we help shoppers save money.",
  openGraph: {
    title: "About • PriceStory",
    description:
      "PriceStory tracks product prices across Amazon & Flipkart and alerts you to drops. Save money with instant price alerts.",
    url: `${SITE}/about`,
    siteName: "PriceStory",
    images: [{ url: `${SITE}/og-default.png`, width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About • PriceStory",
    description:
      "PriceStory tracks product prices across Amazon & Flipkart and alerts you to drops. Save money with instant price alerts.",
  },
  alternates: {
    canonical: `${SITE}/about`,
  },
};

export default function AboutPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "url": `${SITE}/about`,
    "headline": "About PriceStory",
    "description":
      "PriceStory tracks product prices across Amazon & Flipkart and sends alerts when prices drop. Save time and money.",
    "publisher": {
      "@type": "Organization",
      "name": "PriceStory",
      "url": SITE,
    },
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <h1 className="text-3xl font-bold mb-6">About PriceStory</h1>
      <p className="text-slate-600 mb-4">
        PriceStory helps you track prices across Amazon & Flipkart. Get instant alerts when
        prices drop so you never miss a deal.
      </p>
      <p className="text-slate-600 mb-4">
        We monitor product pages, record price history and notify you when a desired price is reached.
      </p>
      <p className="text-slate-600">
        Built with performance and SEO in mind to make sure your deals are discoverable.
      </p>
    </main>
  );
}
