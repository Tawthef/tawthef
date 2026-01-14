import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/landing/HeroSection";
import IntelligenceFocusSection from "@/components/landing/IntelligenceFocusSection";
import SearchExperienceSection from "@/components/landing/SearchExperienceSection";
import WhatIsTawthef from "@/components/landing/WhatIsTawthef";
import HowItWorks from "@/components/landing/HowItWorks";
import BenefitsSection from "@/components/landing/BenefitsSection";
import CTASection from "@/components/landing/CTASection";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <HeroSection />
        <IntelligenceFocusSection />
        <SearchExperienceSection />
        <WhatIsTawthef />
        <HowItWorks />
        <BenefitsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
