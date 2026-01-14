import { useState } from "react";
import { Building2, Users, CheckCircle, EyeOff, Lock, UserCheck, FileSearch, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const HowItWorks = () => {
  const [activeTab, setActiveTab] = useState<"agency" | "direct">("agency");

  const agencyFlow = {
    title: "Agency-Led Recruitment",
    subtitle: "Agencies vet candidates before employer visibility",
    level1: {
      title: "Agency Shortlisting",
      icon: FileSearch,
      steps: [
        { icon: Users, text: "Employer assigns job to agencies" },
        { icon: FileSearch, text: "Agency sources & screens candidates" },
        { icon: CheckCircle, text: "Internal vetting process" },
        { icon: Send, text: "Submit approved candidates only" },
      ],
      privacy: "Employer cannot see candidates until agency submits",
    },
    level2: {
      title: "Employer Review",
      icon: UserCheck,
      steps: [
        { icon: FileSearch, text: "HR reviews submitted profiles" },
        { icon: CheckCircle, text: "Approve, reject, or clarify" },
        { icon: Users, text: "Forward to technical team" },
        { icon: UserCheck, text: "Schedule interviews & offers" },
      ],
      privacy: "Full visibility into agency-vetted candidates",
    },
  };

  const directFlow = {
    title: "Direct Recruitment",
    subtitle: "HR screens before expert evaluation",
    level1: {
      title: "HR Shortlisting",
      icon: FileSearch,
      steps: [
        { icon: Send, text: "Post job publicly or privately" },
        { icon: Users, text: "Candidates apply directly" },
        { icon: FileSearch, text: "HR screens all applications" },
        { icon: CheckCircle, text: "Create initial shortlist" },
      ],
      privacy: "Only HR sees the raw applicant pool",
    },
    level2: {
      title: "Technical Review",
      icon: UserCheck,
      steps: [
        { icon: FileSearch, text: "Review HR-approved candidates" },
        { icon: CheckCircle, text: "Score skills objectively" },
        { icon: Send, text: "Add structured feedback" },
        { icon: UserCheck, text: "Final recommendation" },
      ],
      privacy: "Experts cannot see raw applicants",
    },
  };

  const flow = activeTab === "agency" ? agencyFlow : directFlow;

  return (
    <section id="how-it-works" className="py-24 lg:py-32 gradient-section-alt relative overflow-hidden">

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-headline text-foreground mb-6">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-subhead max-w-2xl mx-auto">
            Two recruitment models, one principle — mandatory two-level shortlisting
            for quality and accountability.
          </p>
        </div>

        {/* Tab Selector - refined */}
        <div className="flex justify-center mb-16">
          <div className="inline-flex p-1 bg-muted/50 backdrop-blur-sm rounded-lg border border-border/30">
            <button
              onClick={() => setActiveTab("agency")}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                activeTab === "agency"
                  ? "bg-white text-foreground shadow-sm"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="w-4 h-4" />
              Agency-Led
            </button>
            <button
              onClick={() => setActiveTab("direct")}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                activeTab === "direct"
                  ? "bg-white text-foreground shadow-sm"
                  : "bg-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Building2 className="w-4 h-4" />
              Direct Hire
            </button>
          </div>
        </div>

        {/* Flow diagram */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Level 1 */}
            <div className="card-premium p-8 lg:p-10 relative border-border/60 shadow-lg">
              {/* Level badge - inside card */}
              <div className="inline-flex bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-6">
                LEVEL 1
              </div>

              <div className="flex items-center gap-5 mb-8">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
                  <flow.level1.icon className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{flow.level1.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 font-normal">Initial screening phase</p>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {flow.level1.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-4 p-3.5 rounded-lg bg-muted/30 border border-border/30">
                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm border border-border/20">
                      <step.icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{step.text}</span>
                  </div>
                ))}
              </div>

              {/* Privacy note */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
                <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground/80 leading-snug">
                  <strong className="text-foreground font-medium">Privacy: </strong>
                  {flow.level1.privacy}
                </span>
              </div>
            </div>

            {/* Level 2 */}
            <div className="card-premium p-8 lg:p-10 relative border-accent/20 shadow-lg" style={{ borderColor: 'hsl(var(--accent) / 0.15)' }}>
              {/* Level badge - inside card */}
              <div className="inline-flex bg-accent/10 text-accent text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full mb-6">
                LEVEL 2
              </div>

              <div className="flex items-center gap-5 mb-8">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center border border-accent/10">
                  <flow.level2.icon className="w-7 h-7 text-accent" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground">{flow.level2.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5 font-normal">Expert evaluation phase</p>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {flow.level2.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-4 p-3.5 rounded-lg bg-muted/30 border border-border/30">
                    <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm border border-border/20">
                      <step.icon className="w-4 h-4 text-accent" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{step.text}</span>
                  </div>
                ))}
              </div>

              {/* Visibility note */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-accent/5 border border-accent/10">
                <EyeOff className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <span className="text-sm text-foreground/80 leading-snug">
                  <strong className="text-foreground font-medium">Visibility: </strong>
                  {flow.level2.privacy}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
