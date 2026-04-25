import { Lock, MapPin, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

interface DemoCandidate {
  skills: string[];
  matchedSkills: string[];
  missingSkills: string[];
  experience: number;
  location: string;
  matchScore: number;
}

const DEMO_CANDIDATES: DemoCandidate[] = [
  {
    skills: ["React", "TypeScript", "Node.js", "GraphQL"],
    matchedSkills: ["React", "TypeScript"],
    missingSkills: ["GraphQL"],
    experience: 6,
    location: "Dubai, UAE",
    matchScore: 87,
  },
  {
    skills: ["Python", "Django", "AWS", "PostgreSQL"],
    matchedSkills: ["Python", "Django"],
    missingSkills: ["AWS"],
    experience: 4,
    location: "Riyadh, KSA",
    matchScore: 74,
  },
  {
    skills: ["Product Management", "Agile", "JIRA", "Roadmapping"],
    matchedSkills: ["Product Management"],
    missingSkills: [],
    experience: 8,
    location: "Abu Dhabi, UAE",
    matchScore: 62,
  },
];

const scoreClass = (score: number) => {
  if (score > 80) return "bg-green-500/10 text-green-600 border-green-500/30";
  if (score >= 60) return "bg-primary/10 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
};

const SearchExperienceSection = () => {
  return (
    <section className="relative py-12 lg:py-16 overflow-hidden">
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] max-w-[90vw] max-h-[90vw] rounded-full"
        style={{
          background: "radial-gradient(circle at center, hsl(var(--primary) / 0.04), transparent 70%)",
          zIndex: 0,
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-1.5 mb-6 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Resume Search</span>
            </div>
            <h2 className="text-headline text-foreground mb-4 tracking-tight">
              Find Your Next Hire
            </h2>
            <p className="text-subhead max-w-xl mx-auto leading-relaxed">
              Search qualified candidates by skills, experience, and location. Subscribe to unlock full profiles and contact details.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {DEMO_CANDIDATES.map((candidate, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border/50 bg-card p-5 space-y-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-muted-foreground/50 text-sm select-none">Hidden Candidate</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" />
                        {candidate.location}
                      </p>
                    </div>
                  </div>
                  <Badge className={`border text-xs shrink-0 ${scoreClass(candidate.matchScore)}`}>
                    {candidate.matchScore}%
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">{candidate.experience} yrs experience</p>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs px-2 py-0">{skill}</Badge>
                    ))}
                  </div>
                </div>

                {candidate.matchedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.matchedSkills.map((skill) => (
                      <Badge key={skill} className="bg-green-500/10 text-green-600 border-green-500/30 text-xs px-2 py-0">{skill}</Badge>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <div className="flex-1 h-8 rounded-lg bg-muted/60 flex items-center justify-center gap-1.5 text-xs text-muted-foreground border border-border/40">
                    <Lock className="w-3 h-3" />
                    Profile
                  </div>
                  <div className="flex-1 h-8 rounded-lg bg-muted/60 flex items-center justify-center gap-1.5 text-xs text-muted-foreground border border-border/40">
                    <Lock className="w-3 h-3" />
                    CV
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Subscribe to Resume Search to unlock candidate names, CVs, and contact details.
            </p>
            <Link to="/pricing">
              <Button size="lg" className="shadow-lg shadow-primary/20">
                View Plans
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SearchExperienceSection;
