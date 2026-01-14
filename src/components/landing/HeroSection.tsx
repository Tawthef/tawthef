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
            <span className="text-[13px] font-medium text-foreground/80">AI-Powered Enterprise Recruitment</span>
          </div>

          {/* Main headline - compact typography */}
          <div className="animate-slide-up">
            <h1 className="mb-6">
              <span className="block text-lg sm:text-xl lg:text-2xl font-light text-foreground/50 tracking-wide mb-2">
                The Future of
              </span>
              <span className="block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-primary tracking-tighter leading-[1.1]">
                Structured Hiring
              </span>
            </h1>

            {/* Subheadline - concise */}
            <p className="text-base lg:text-lg text-foreground/60 max-w-md mx-auto mb-8 leading-relaxed">
              Accountable workflows. Two-level vetting. Zero blind spots.
            </p>
          </div>

          {/* CTA Buttons - compact, Glozo-style */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <Link to="/register">
              <Button
                className="group h-11 text-sm font-semibold px-8 bg-primary hover:bg-primary/90 text-white transition-all rounded-md shadow-sm"
              >
                Request Access
                <ArrowRight className="w-4 h-4 ml-2 text-white/90 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>
            <a href="#intelligence">
              <Button variant="outline" className="h-11 text-sm font-medium text-foreground/80 hover:text-foreground px-8 border-foreground/20 hover:border-foreground/40 rounded-md bg-transparent transition-colors">
                See How It Works
              </Button>
            </a>
          </div>

          {/* Authority signal */}
          <p className="text-[11px] text-foreground/40 tracking-wide uppercase mb-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            Built for enterprise, agency, and technical hiring
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
