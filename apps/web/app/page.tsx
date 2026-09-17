import type { Metadata } from "next";
import { BigPicture } from "../components/home/big-picture";
import { ChamberSteps } from "../components/home/chamber-steps";
import { Closing } from "../components/home/closing";
import { DimensionsBand } from "../components/home/dimensions-band";
import { DraftReviewCards } from "../components/home/draft-review-cards";
import { Hero } from "../components/home/hero";
import { HowItWorks } from "../components/home/how-it-works";
import { MatterDocs } from "../components/home/matter-docs";
import { Reveal } from "../components/home/motion";
import { Plans } from "../components/home/plans";
import { SiteNav } from "../components/home/site-nav";

export const metadata: Metadata = {
  title: "Veritas — Draft with the evidence beside you",
  description:
    "Evidence-linked legal drafting and verification workspace for Indian advocates and litigation chambers.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-foreground selection:bg-[#487aa8] selection:text-white">
      {/* Floating unified pill navbar */}
      <SiteNav />

      <main className="overflow-x-clip">
        {/* Full-width edge-to-edge Sky Hero banner with interactive Before/After docket */}
        <Hero />

        {/* See the Big Picture (01-04 numbered narrative + 4 feature cards) */}
        <BigPicture />

        {/* Side-by-side Bento Cards: 4-Axis Citation Check & Document Discrepancies */}
        <DraftReviewCards />

        {/* Matter intake documents showcase */}
        <MatterDocs />

        {/* 4-Axis Verification Dimension Chips */}
        <DimensionsBand />

        {/* Workflow Steps */}
        <section
          id="workflow"
          className="mx-auto w-full max-w-6xl scroll-mt-28 px-5 pt-24 sm:px-8"
        >
          <Reveal>
            <HowItWorks />
          </Reveal>
        </section>

        {/* Chamber Steps */}
        <ChamberSteps />

        {/* Simple Honest Pricing in Rupees (Free, ₹399, ₹899) */}
        <Plans />

        {/* Professional Closing & Monochromatic Footer */}
        <Closing />
      </main>
    </div>
  );
}
