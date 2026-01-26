import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden gradient-hero">
      {/* Single primary radial - structured, minimal */}
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] max-w-[90vw] max-h-[90vw] rounded-full bg-gradient-radial from-primary/4 via-primary/2 to-transparent blur-3xl" />
      </div>

      {/* Very subtle grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(220,20%,88%,0.12)_1px,transparent_1px),linear-gradient(to_bottom,hsl(220,20%,88%,0.12)_1px,transparent_1px)] bg-[size:80px_80px] -z-10" />

      {/* Hero content container - tighter top padding */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-32 flex-1 flex flex-col justify-center">
        <div className="max-w-4xl mx-auto text-center">
          {/* Announcement badge */}
          <div className="inline-flex items-center gap-2 bg-card/70 backdrop-blur-sm border border-border/30 rounded-full px-5 py-2 mb-6 shadow-sm animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="text-[13px] font-medium text-foreground/80">Transparent. Fair. Human.</span>
          </div>

          {/* Main headline - candidate-focused */}
          <div className="animate-slide-up">
            <h1 className="mb-6">
              <span className="block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-primary tracking-tighter leading-[1.1]">
                Find Jobs. Get Shortlisted.
              </span>
              <span className="block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground tracking-tighter leading-[1.1] mt-2">
                Get Hired.
              </span>
            </h1>

            {/* Subheadline - candidate value proposition */}
            <p className="text-base lg:text-lg text-foreground/60 max-w-2xl mx-auto mb-8 leading-relaxed">
              A modern hiring platform that connects candidates with trusted recruiters — transparently and fairly.
            </p>
          </div>

          {/* Single Primary CTA */}
          <div
            className="w-full max-w-[340px] md:max-w-none mx-auto flex flex-col items-center justify-center gap-4 mb-8 animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <Link to="/register" className="w-full md:w-auto">
              <Button
                className="w-full md:w-auto group h-[52px] md:h-12 text-base md:text-sm font-semibold px-10 bg-primary hover:bg-primary/90 text-white transition-all rounded-md shadow-lg shadow-primary/20"
              >
                Create Your Free Profile
                <ArrowRight className="w-4 h-4 ml-2 text-white/90 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>

            {/* Low-emphasis recruiter link */}
            <a
              href="#recruiters"
              className="text-sm text-foreground/50 hover:text-foreground/70 transition-colors font-medium"
            >
              Are you a Recruiter? Learn more →
            </a>
          </div>

          {/* Trust signal */}
          <p className="text-[11px] text-foreground/40 tracking-wide uppercase mb-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Trusted by candidates and recruiters across the region
          </p>
        </div>
      </div>

      {/* Scroll indicator - pointing to next section */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <span className="text-xs text-muted-foreground/50 font-medium tracking-wide uppercase">Discover</span>
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/20 flex items-start justify-center p-2">
          <div className="w-1.5 h-2.5 rounded-full bg-muted-foreground/40 animate-bounce" />
        </div>
      </div>

      {/* Bottom gradient fade for seamless transition */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, transparent, hsl(235 30% 96%))',
        }}
      />
    </section>
  );
};

export default HeroSection;
