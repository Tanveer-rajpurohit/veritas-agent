import type { Metadata } from "next";
import { CapabilitiesSection } from "../components/home/capabilities-section";
import { Closing } from "../components/home/closing";
import { DraftReviewCards } from "../components/home/draft-review-cards";
import { FAQSection } from "../components/home/faq-section";
import { FeatureCarousel } from "../components/home/feature-carousel";
import { Hero } from "../components/home/hero";
import { InfoSection } from "../components/home/info-section";
import { Plans } from "../components/home/plans";
import { SiteNav } from "../components/home/site-nav";
import { SmoothScroll } from "../components/SmoothScroll";

export const metadata: Metadata = {
  title: {
    absolute: "Veritas legal drafting workspace",
  },
  description:
    "Draft legal documents and verify every claim against its source in a workspace built for Indian lawyers.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <SmoothScroll>
      <div className="min-h-screen bg-white text-foreground selection:bg-[#487aa8] selection:text-white">
        {/* Floating unified pill navbar */}
        <SiteNav />

        <main className="overflow-x-clip">
          {/* Full-width edge-to-edge Sky Hero banner with GSAP word reveal & open envelope */}
          <Hero />

          <InfoSection />

          {/* 3-tab auto-progressing feature carousel matching SIH */}
          <FeatureCarousel />

          {/* 01-04 Numbered Platform Capabilities & Workflow Pipeline */}
          <CapabilitiesSection />

          {/* Side-by-side Bento Cards: 4-Axis Citation Check & Document Discrepancies */}
          <DraftReviewCards />

          {/* Simple Honest Pricing in Rupees (Free, ₹399, ₹899) */}
          <Plans />

          {/* Frequently Asked Questions */}
          <FAQSection />

          {/* Professional Closing & Monochromatic Footer */}
          <Closing />
        </main>
      </div>
    </SmoothScroll>
  );
}
