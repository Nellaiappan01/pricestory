// src/app/contact/page.tsx
import type { Metadata } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pricestory.vercel.app";

export const metadata: Metadata = {
  title: "Contact • PriceStory",
  description: "Contact PriceStory for support, partnerships or press enquiries.",
  openGraph: {
    title: "Contact • PriceStory",
    description: "Contact PriceStory for support, partnerships or press enquiries.",
    url: `${SITE}/contact`,
    siteName: "PriceStory",
    images: [{ url: `${SITE}/og-default.png`, width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Contact • PriceStory",
    description: "Contact PriceStory for support and partnerships.",
  },
  alternates: {
    canonical: `${SITE}/contact`,
  },
};

export default function ContactPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    "url": `${SITE}/contact`,
    "description": "Contact PriceStory for support, partnerships or press enquiries.",
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <h1 className="text-3xl font-bold mb-6">Contact</h1>
      <p className="text-slate-600 mb-4">
        Need help or have a question? Reach out to us at{" "}
        <a className="underline" href="mailto:support@pricestory.vercel.app">
          support@pricestory.vercel.app
        </a>
        .
      </p>

      <div className="grid gap-4">
        <div>
          <strong>Support</strong>
          <div className="text-slate-600">support@pricestory.vercel.app</div>
        </div>
        <div>
          <strong>Partnerships</strong>
          <div className="text-slate-600">partners@pricestory.vercel.app</div>
        </div>
        <div>
          <strong>Press</strong>
          <div className="text-slate-600">press@pricestory.vercel.app</div>
        </div>
      </div>
    </main>
  );
}
