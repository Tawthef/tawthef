import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import WhatIsTawthef from "@/components/landing/WhatIsTawthef";
import FeatureHighlightsSection from "@/components/landing/FeatureHighlightsSection";
import HowItWorks from "@/components/landing/HowItWorks";
import SearchExperienceSection from "@/components/landing/SearchExperienceSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import FaqSection from "@/components/landing/FaqSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <WhatIsTawthef />
        <FeatureHighlightsSection />
        <HowItWorks />
        <SearchExperienceSection />
        <BenefitsSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
