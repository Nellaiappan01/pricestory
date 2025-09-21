// src/app/layout.tsx
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SessionProviderWrapper from "@/components/providers/SessionProviderWrapper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900">
        <SessionProviderWrapper>
          <Header />
          <main>{children}</main>
          <Footer />
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
