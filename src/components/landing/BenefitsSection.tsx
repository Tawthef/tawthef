import {
  Building2,
  Users,
  Clock,
  BarChart3,
  Shield,
  Zap,
  Eye,
  CheckCircle2,
  FileText,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const BenefitsSection = () => {
  const employerBenefits = [
    {
      icon: Clock,
      title: "Reduce Time-to-Hire",
      description: "Structured workflows eliminate bottlenecks and accelerate hiring by 40%.",
    },
    {
      icon: CheckCircle2,
      title: "Quality Candidates",
      description: "Two-level shortlisting ensures you only see pre-vetted, qualified talent.",
    },
    {
      icon: Eye,
      title: "Full Visibility",
      description: "Track every candidate's journey with complete audit trails.",
    },
    {
      icon: BarChart3,
      title: "Hiring Analytics",
      description: "Data-driven insights into performance, time-to-fill, and costs.",
    },
  ];

  const agencyBenefits = [
    {
      icon: Shield,
      title: "Protected Submissions",
      description: "Candidates are protected until you choose to submit them.",
    },
    {
      icon: FileText,
      title: "Structured Feedback",
      description: "Receive clear, actionable feedback on every submission.",
    },
    {
      icon: TrendingUp,
      title: "Performance Tracking",
      description: "Track placement success and optimize sourcing strategies.",
    },
    {
      icon: Zap,
      title: "Streamlined Workflow",
      description: "Manage multiple employer relationships from one dashboard.",
    },
  ];

  return (
    <section className="py-24 lg:py-32 gradient-section relative overflow-hidden">
      {/* Ambient elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[30%] right-[5%] w-[350px] h-[350px] rounded-full bg-primary/3 blur-3xl" />
        <div className="absolute bottom-[20%] left-[10%] w-[300px] h-[300px] rounded-full bg-accent/4 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Employers Section */}
        <div id="employers" className="mb-24 lg:mb-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left content */}
            <div>
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <span className="text-xs font-bold text-primary uppercase tracking-widest">For Employers</span>
              </div>
              <h2 className="text-headline text-foreground mb-6">
                Hire Better,<br />
                <span className="text-primary">Faster</span>
              </h2>
              <p className="text-subhead mb-8 max-w-lg">
                Streamline your hiring with structured workflows, agency collaboration,
                and complete visibility into your talent pipeline.
              </p>
              <Link to="/register">
                <Button variant="hero" size="lg" className="group text-sm px-6 h-12">
                  Start Hiring <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>

            {/* Right cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {employerBenefits.map((benefit, index) => (
                <div
                  key={benefit.title}
                  className="group card-float p-6"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/12 to-primary/4 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                    <benefit.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-normal">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subtle divider */}
        <div className="relative my-16">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
          </div>
          <div className="relative flex justify-center">
            <div className="bg-background/80 backdrop-blur-sm px-6 py-2.5 rounded-full border border-border/30">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Built for collaboration</span>
            </div>
          </div>
        </div>

        {/* Agencies Section */}
        <div id="agencies" className="pt-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left cards - reversed order on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:order-1">
              {agencyBenefits.map((benefit, index) => (
                <div
                  key={benefit.title}
                  className="group card-float p-6"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/12 to-accent/4 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-500">
                    <benefit.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-normal">
                    {benefit.description}
                  </p>
                </div>
              ))}
            </div>

            {/* Right content */}
            <div className="lg:order-2">
              <div className="inline-flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <span className="text-xs font-bold text-accent uppercase tracking-widest">For Agencies</span>
              </div>
              <h2 className="text-headline text-foreground mb-6">
                Protect Your<br />
                <span className="text-primary">Relationships</span>
              </h2>
              <p className="text-subhead mb-8 max-w-lg">
                Build transparent, long-term partnerships with enterprise employers
                while protecting your candidate relationships.
              </p>
              <Link to="/register">
                <Button variant="outline" size="lg" className="group text-sm px-6 h-12 border-accent/20 text-foreground hover:border-accent hover:bg-accent/5">
                  Partner With Us <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform text-accent" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Inline conversion CTA */}
        <div className="text-center mt-16">
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-primary transition-colors group"
          >
            See how this works in practice
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
