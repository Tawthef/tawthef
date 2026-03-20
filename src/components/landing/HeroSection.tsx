import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import dashboard1 from "@/assets/dashboard1.png";
import dashboard2 from "@/assets/dashboard2.png";
import dashboard3 from "@/assets/dashboard3.png";
import dashboard4 from "@/assets/dashboard4.png";

const showcaseImages = [
  {
    src: dashboard1,
    alt: "Recruiter dashboard overview",
    label: "Recruiter Dashboard",
  },
  {
    src: dashboard2,
    alt: "AI candidate ranking interface",
    label: "AI Candidate Ranking",
  },
  {
    src: dashboard3,
    alt: "Interview pipeline view",
    label: "Interview Pipeline",
  },
  {
    src: dashboard4,
    alt: "Hiring analytics and activity view",
    label: "Hiring Analytics",
  },
] as const;

const HeroSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % showcaseImages.length);
    }, 4000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const goToPrevious = () => {
    setActiveIndex((current) => (current - 1 + showcaseImages.length) % showcaseImages.length);
  };

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % showcaseImages.length);
  };

  return (
    <section className="relative min-h-screen flex flex-col overflow-hidden gradient-hero">
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-[30%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] max-w-[90vw] max-h-[90vw] rounded-full bg-gradient-radial from-primary/4 via-primary/2 to-transparent blur-3xl" />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(220,20%,88%,0.12)_1px,transparent_1px),linear-gradient(to_bottom,hsl(220,20%,88%,0.12)_1px,transparent_1px)] bg-[size:80px_80px] -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-32 flex-1 flex flex-col justify-center">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-card/70 backdrop-blur-sm border border-border/30 rounded-full px-5 py-2 mb-6 shadow-sm animate-fade-in">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="text-[13px] font-medium text-foreground/80">Transparent. Fair. Human.</span>
          </div>

          <div className="animate-slide-up">
            <h1 className="mb-8">
              <span className="block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-primary tracking-tighter leading-[1.1]">
                Find Jobs. Get Shortlisted.
              </span>
              <span className="block text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground tracking-tighter leading-[1.1] mt-2">
                Get Hired.
              </span>
            </h1>

            <p className="text-base lg:text-lg text-foreground/60 max-w-2xl mx-auto mb-4 leading-relaxed">
              A modern hiring platform that connects candidates with trusted recruiters, transparently and fairly.
            </p>
            <p className="text-sm sm:text-base text-foreground/60 leading-relaxed max-w-2xl mx-auto mb-3">
              Structured hiring powered by transparency and AI-assisted screening.
            </p>
            <p className="text-xs text-muted-foreground text-center mb-8">
              Trusted hiring platform for candidates, recruiters, and agencies.
            </p>
          </div>

          <div
            className="w-full max-w-[340px] md:max-w-none mx-auto flex flex-col items-center justify-center gap-4 mb-8 animate-fade-in"
            style={{ animationDelay: "0.2s" }}
          >
            <Link to="/register" className="w-full md:w-auto">
              <Button
                className="w-full md:w-auto group h-[52px] md:h-12 text-base md:text-sm font-semibold px-10 bg-primary hover:bg-primary/90 text-white transition-all hover:scale-[1.02] rounded-md shadow-lg shadow-primary/20"
              >
                Create Your Free Profile
                <ArrowRight className="w-4 h-4 ml-2 text-white/90 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </Link>

            <a
              href="#recruiters"
              className="text-sm text-foreground/50 hover:text-foreground/70 transition-colors font-medium"
            >
              Are you a Recruiter? Learn more
            </a>
          </div>

          <div className="w-full max-w-[900px] mx-auto mb-8 px-1 sm:px-0 animate-fade-in" style={{ animationDelay: "0.25s" }}>
            <div className="relative overflow-hidden rounded-2xl shadow-xl shadow-black/10 border border-border/30 bg-card/80">
              <div className="relative overflow-hidden">
                <div
                  className="flex transition-transform duration-700 ease-out"
                  style={{ transform: `translateX(-${activeIndex * 100}%)` }}
                >
                  {showcaseImages.map((image) => (
                    <div key={image.label} className="min-w-full">
                      <img
                        src={image.src}
                        alt={image.alt}
                        className="w-full h-auto object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>

                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950/30 via-slate-950/10 to-transparent" />
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4 rounded-full bg-card/88 backdrop-blur-md border border-white/30 px-3 py-1 text-[10px] sm:text-xs font-medium text-foreground/85 shadow-sm">
                  {showcaseImages[activeIndex].label}
                </div>

                <div className="absolute inset-y-0 left-3 right-3 flex items-center justify-between sm:left-4 sm:right-4">
                  <button
                    type="button"
                    onClick={goToPrevious}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-slate-950/50 text-white backdrop-blur-md transition-all hover:bg-slate-950/65"
                    aria-label="Show previous screenshot"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNext}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-slate-950/50 text-white backdrop-blur-md transition-all hover:bg-slate-950/65"
                    aria-label="Show next screenshot"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-card/80 px-3 py-2 backdrop-blur-md sm:bottom-4">
                  {showcaseImages.map((image, index) => {
                    const isActive = index === activeIndex;

                    return (
                      <button
                        key={image.label}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        className={`h-2.5 rounded-full transition-all duration-300 ${
                          isActive ? "w-6 bg-primary" : "w-2.5 bg-foreground/25 hover:bg-foreground/40"
                        }`}
                        aria-label={`Show ${image.label}`}
                        aria-pressed={isActive}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-fade-in" style={{ animationDelay: "0.5s" }}>
        <span className="text-xs text-muted-foreground/50 font-medium tracking-wide uppercase">Discover</span>
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/20 flex items-start justify-center p-2">
          <div className="w-1.5 h-2.5 rounded-full bg-muted-foreground/40 animate-bounce" />
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, hsl(235 30% 96%))",
        }}
      />
    </section>
  );
};

export default HeroSection;
