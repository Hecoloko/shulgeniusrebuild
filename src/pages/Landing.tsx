import React from "react";
import GlobalShulNetwork from "@/components/landing/GlobalShulNetwork";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import TrustedBy from "@/components/landing/TrustedBy";
import StatsStrip from "@/components/landing/StatsStrip";
import FeatureGrid from "@/components/landing/FeatureGrid";
import HowItWorks from "@/components/landing/HowItWorks";
import Testimonials from "@/components/landing/Testimonials";
import FAQ from "@/components/landing/FAQ";
import CtaSection from "@/components/landing/CtaSection";

export default function Landing() {
    return (
        <div className="min-h-screen text-stone-900 font-sans selection:bg-amber-100 selection:text-amber-900 relative overflow-x-hidden">
            {/* Fixed 3D Background - positioned behind all content */}
            <GlobalShulNetwork />

            {/* Navigation */}
            <Navbar />

            {/* Main Content Sections */}
            <main className="relative z-10">
                <Hero />
                <TrustedBy />
                <StatsStrip />
                <FeatureGrid />
                <HowItWorks />
                <Testimonials />
                <FAQ />
                <CtaSection />

                {/* Footprint to ensure document height is large enough to scroll forever */}
                <div className="h-[800vh] pointer-events-none opacity-0" />
            </main>

            {/* Footer */}
            <footer className="bg-white/80 backdrop-blur-md border-t border-stone-200 py-12 text-center text-stone-500 text-sm font-medium relative z-20">
                <p>© 2026 ShulGenius. Built with ❤️ for Klal Yisrael.</p>
            </footer>
        </div>
    );
}
