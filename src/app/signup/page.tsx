// src/app/signup/page.tsx
import type { Metadata } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://pricestory.vercel.app";

export const metadata: Metadata = {
  title: "Signup • PriceStory",
  description: "Create a PriceStory account to start tracking prices and get alerts.",
  openGraph: {
    title: "Signup • PriceStory",
    description: "Create a PriceStory account to start tracking prices and get alerts.",
    url: `${SITE}/signup`,
    siteName: "PriceStory",
    images: [{ url: `${SITE}/og-default.png`, width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Signup • PriceStory",
    description: "Create a PriceStory account to start tracking prices and get alerts.",
  },
  alternates: {
    canonical: `${SITE}/signup`,
  },
};

export default function SignupPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "RegisterAction",
    "target": `${SITE}/signup`,
    "description": "Register at PriceStory to receive price drop notifications.",
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <h1 className="text-3xl font-bold mb-6">Create your PriceStory account</h1>
      <p className="text-slate-600 mb-4">Sign up to track prices and receive smart alerts.</p>

      {/* Preserve your existing signup UI here. If you have a client component, import it:
          import SignupForm from "@/components/SignupForm";
          and then render <SignupForm />
          For now a minimal CTA is provided so the page builds without errors.
      */}
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <p className="text-slate-700">Signup form goes here — keep your existing client form component.</p>
      </div>
    </main>
  );
}
