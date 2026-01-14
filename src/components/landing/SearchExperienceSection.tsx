import { useState, useRef, useEffect } from "react";
import { Search, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const placeholderExamples = [
  "Senior React Developer, 5+ years experience",
  "ML Engineer with PyTorch expertise",
  "Product Manager, fintech background",
  "DevOps Lead, Kubernetes certified",
  "UX Designer with enterprise SaaS experience",
];

const exampleQueries = [
  "Senior React Developer",
  "Product Manager, SaaS",
  "Data Engineer, remote",
  "UX Designer, 3+ years",
];

const searchChips = [
  "Remote OK",
  "5+ Years",
  "Senior Level",
  "Full-time",
  "Tech Lead",
  "Startup Experience",
];

const SearchExperienceSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // IntersectionObserver for reveal animation
  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true); // Fallback: show immediately
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const toggleChip = (chip: string) => {
    if (selectedChips.includes(chip)) {
      setSelectedChips(selectedChips.filter(c => c !== chip));
    } else {
      setSelectedChips([...selectedChips, chip]);
      // Show brief feedback
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 1500);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim() || selectedChips.length > 0) {
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 2000);
    }
  };

  // Rotate placeholder
  const handleFocus = () => {
    setPlaceholderIndex((prev) => (prev + 1) % placeholderExamples.length);
  };

  return (
    <section ref={sectionRef} className="relative py-12 lg:py-16 overflow-hidden">
      <div
        className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-[800px] h-[800px] max-w-[90vw] max-h-[90vw]
            rounded-full
            transition-all ease-out
            ${prefersReducedMotion ? 'duration-300' : 'duration-[1500ms]'}
            ${isVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
          `}
        style={{
          background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.04), transparent 70%)',
          zIndex: 0
        }}
      />

      {/* Content - above reveal circle */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div
          className={`
            max-w-3xl mx-auto
            transition-opacity ease-out
            ${prefersReducedMotion ? 'duration-300' : 'duration-[1200ms] transition-all'}
            ${isVisible ? 'opacity-100' : 'opacity-0'}
            ${!prefersReducedMotion && (isVisible ? 'translate-y-0' : 'translate-y-8')}
          `}
          style={{ transitionDelay: isVisible ? (prefersReducedMotion ? '0ms' : '200ms') : '0ms' }}
        >
          {/* Section header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-6 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Explore Intelligence</span>
            </div>
            <h2 className="text-headline text-foreground mb-4 tracking-tight">
              Search Your Way
            </h2>
            <p className="text-subhead max-w-xl mx-auto">
              Describe your ideal candidate naturally. Our AI understands context, not just keywords.
            </p>
          </div>

          {/* Search container */}
          <div className="relative">
            {/* Helper text */}
            <p className="text-center text-sm text-foreground/70 mb-4 font-medium">
              Try it now — no login required
            </p>

            {/* Search card - High Contrast */}
            <div className="card-premium p-3 sm:p-5 border-border/60 shadow-xl">
              {/* Search input row */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={handleFocus}
                    placeholder={placeholderExamples[placeholderIndex]}
                    className="w-full h-14 sm:h-16 pl-12 pr-4 bg-white border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all text-base shadow-inner"
                  />
                </div>
                <Button
                  onClick={handleSearch}
                  className="h-14 sm:h-16 px-6 sm:px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-lg shadow-primary/25 text-base"
                >
                  <span className="hidden sm:inline">Search</span>
                  <Search className="w-5 h-5 sm:ml-2" />
                </Button>
              </div>

              {/* Example query chips - autofill on click */}
              <div className="flex flex-wrap gap-2.5 mt-5 px-1">
                <span className="text-xs text-muted-foreground mr-1 self-center font-medium">Try:</span>
                {exampleQueries.map((query) => (
                  <button
                    key={query}
                    onClick={() => {
                      setSearchQuery(query);
                      setShowFeedback(true);
                      setTimeout(() => setShowFeedback(false), 1500);
                    }}
                    className="px-3 py-1.5 rounded-full text-sm font-medium bg-muted/70 text-foreground/80 hover:bg-muted hover:text-foreground transition-all border border-transparent hover:border-border/50"
                  >
                    {query}
                  </button>
                ))}
              </div>

              {/* Suggestion chips */}
              <div className="flex flex-wrap gap-2.5 mt-4 px-1">
                {searchChips.map((chip) => {
                  const isSelected = selectedChips.includes(chip);
                  return (
                    <button
                      key={chip}
                      onClick={() => toggleChip(chip)}
                      className={`
                        inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                        ${isSelected
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                          : 'bg-secondary/80 text-secondary-foreground hover:bg-secondary border border-transparent hover:border-border/30'
                        }
                      `}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      {chip}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Feedback message */}
            <div
              className={`
                absolute -bottom-16 left-1/2 -translate-x-1/2 
                flex items-center gap-2 bg-card border border-border/50 rounded-full px-5 py-2.5 shadow-lg
                transition-all duration-300
                ${showFeedback ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
              `}
            >
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-sm text-foreground/80">
                {selectedChips.length > 0
                  ? `${selectedChips.length} filter${selectedChips.length > 1 ? 's' : ''} applied`
                  : 'Analyzing context...'
                }
              </span>
            </div>
          </div>

          {/* Helper text */}
          <p className="text-center text-sm text-muted-foreground/60 mt-20">
            No login required. This is an exploratory search to demonstrate AI intelligence.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SearchExperienceSection;
