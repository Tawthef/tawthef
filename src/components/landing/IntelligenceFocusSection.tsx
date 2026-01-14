import { Brain, Zap, Target } from "lucide-react";

const IntelligenceFocusSection = () => {
  return (
    <section
      id="intelligence"
      className="relative py-16 lg:py-20 overflow-hidden"
    >
      {/* Neutral gradient background - structured, minimal */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(180deg, 
                hsl(220 15% 97%) 0%, 
                hsl(220 12% 96%) 50%,
                hsl(220 10% 95%) 100%
              )
            `,
          }}
        />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main headline */}
          <h2 className="text-headline text-foreground mb-6 animate-fade-in">
            Built Around
            <span className="block gradient-text">Accountability</span>
          </h2>

          <p className="text-subhead max-w-2xl mx-auto mb-12 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Every candidate, every decision, every handoff — tracked and auditable.
            No blind spots in your hiring process.
          </p>

          {/* Feature indicators */}
          <div
            className="flex flex-wrap justify-center gap-4 animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            {[
              { icon: Brain, label: "Structured Workflows" },
              { icon: Target, label: "Two-Level Shortlisting" },
              { icon: Zap, label: "Full Audit Trail" },
            ].map((feature, index) => (
              <div
                key={feature.label}
                className="inline-flex items-center gap-2.5 bg-white/80 border border-border/40 rounded-full px-5 py-2.5 shadow-sm"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <feature.icon className="w-4 h-4 text-foreground/70" />
                <span className="text-sm font-medium text-foreground/80">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntelligenceFocusSection;
