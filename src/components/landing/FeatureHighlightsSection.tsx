import { CheckCircle2 } from "lucide-react";
import dashboard1 from "@/assets/dashboard1.png";
import dashboard2 from "@/assets/dashboard2.png";
import dashboard3 from "@/assets/dashboard3.png";

const features = [
  {
    image: dashboard1,
    imageAlt: "Two-level shortlisting dashboard",
    heading: "Two-Level Shortlisting — Built In",
    description: "Every job on Tawthef requires two rounds of screening before a candidate reaches the decision stage. No shortcuts, no bias blind spots.",
    bullets: [
      "Agencies vet candidates before the employer ever sees them",
      "HR screens before the technical team gets involved",
      "Full privacy enforced between each stage automatically",
    ],
    imageLeft: true,
  },
  {
    image: dashboard2,
    imageAlt: "AI candidate ranking interface",
    heading: "AI-Powered Candidate Ranking",
    description: "Stop reading 200 CVs manually. Our AI scores each candidate against your job requirements and surfaces the best matches instantly.",
    bullets: [
      "Match score calculated from real skills, not keywords",
      "See matched vs. missing skills side by side",
      "Rank up to 200 candidates in seconds",
    ],
    imageLeft: false,
  },
  {
    image: dashboard3,
    imageAlt: "Hiring audit trail view",
    heading: "Full Audit Trail on Every Hire",
    description: "Know exactly who reviewed which candidate, when, and what they decided. Every action is logged — no more hiring black boxes.",
    bullets: [
      "Every shortlist decision is recorded and timestamped",
      "Clear handoffs between teams with no lost context",
      "GDPR-ready records for compliant hiring",
    ],
    imageLeft: true,
  },
];

const FeatureHighlightsSection = () => {
  return (
    <section id="intelligence" className="py-16 lg:py-24 relative overflow-hidden">
      <div className="absolute inset-0 -z-10" style={{
        background: "linear-gradient(180deg, hsl(220 15% 97%) 0%, hsl(220 12% 96%) 50%, hsl(220 10% 95%) 100%)",
      }} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-headline text-foreground mb-6">
            Built Around <span className="gradient-text">Accountability</span>
          </h2>
          <p className="text-subhead max-w-2xl mx-auto leading-relaxed">
            Every candidate, every decision, every handoff — tracked and auditable. No blind spots in your hiring process.
          </p>
        </div>

        <div className="space-y-20 lg:space-y-28 max-w-6xl mx-auto">
          {features.map((feature) => (
            <div
              key={feature.heading}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                feature.imageLeft ? "" : "lg:[&>*:first-child]:order-2"
              }`}
            >
              {/* Image */}
              <div className="rounded-2xl overflow-hidden border border-border/30 shadow-xl shadow-black/8 bg-card/80">
                <img
                  src={feature.image}
                  alt={feature.imageAlt}
                  className="w-full h-auto object-cover"
                  loading="lazy"
                />
              </div>

              {/* Text */}
              <div className="flex flex-col justify-center">
                <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-4 leading-tight">
                  {feature.heading}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-6 text-base lg:text-lg font-light">
                  {feature.description}
                </p>
                <ul className="space-y-3">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground/80 leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureHighlightsSection;
