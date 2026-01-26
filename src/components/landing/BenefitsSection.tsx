import {
  Sparkles,
  Shield,
  Eye,
  Zap,
  Users,
  Building2,
  TrendingUp,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const BenefitsSection = () => {
  const candidateBenefits = [
    {
      icon: Sparkles,
      title: "AI-Powered Matching",
      description: "Get matched with jobs that fit your skills, experience, and career goals.",
    },
    {
      icon: Eye,
      title: "Transparent Process",
      description: "Track your application status and see exactly where you stand in the hiring process.",
    },
    {
      icon: Shield,
      title: "Quality Opportunities",
      description: "Every job is vetted. Every recruiter is verified. No spam, no scams.",
    },
    {
      icon: Zap,
      title: "Faster Hiring",
      description: "Structured workflows mean faster responses and quicker decisions.",
    },
  ];

  const recruiterBenefits = [
    {
      icon: Users,
      title: "Quality Candidates",
      description: "Access pre-vetted talent with verified skills and experience.",
    },
    {
      icon: TrendingUp,
      title: "Streamlined Workflow",
      description: "Manage your entire hiring pipeline from one powerful dashboard.",
    },
    {
      icon: CheckCircle2,
      title: "Collaborative Hiring",
      description: "Work seamlessly with your team and external partners.",
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
        {/* Candidates Section - Primary Focus */}
        <div className="mb-24 lg:mb-32">
          <div className="text-center mb-16">
            <h2 className="text-headline text-foreground mb-6">
              Why Candidates <span className="text-primary">Love Tawthef</span>
            </h2>
            <p className="text-subhead max-w-2xl mx-auto">
              A hiring platform built for transparency, fairness, and your success.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {candidateBenefits.map((benefit) => (
              <div
                key={benefit.title}
                className="group card-float p-6 text-center"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/12 to-primary/4 flex items-center justify-center mb-5 mx-auto group-hover:scale-110 transition-transform duration-500">
                  <benefit.icon className="w-7 h-7 text-primary" />
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

          <div className="text-center mt-12">
            <Link to="/register">
              <Button variant="hero" size="lg" className="group text-sm px-8 h-12">
                Create Your Profile <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Subtle divider */}
        <div className="relative my-16">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
          </div>
        </div>

        {/* Recruiters Section - Secondary, Merged */}
        <div id="recruiters" className="pt-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-accent" />
              </div>
              <span className="text-xs font-bold text-accent uppercase tracking-widest">For Recruiters</span>
            </div>
            <h2 className="text-headline text-foreground mb-6">
              Built for <span className="text-primary">Hiring Teams</span>
            </h2>
            <p className="text-subhead max-w-2xl mx-auto">
              Whether you're hiring for your own company or placing candidates for clients,
              Tawthef streamlines your workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {recruiterBenefits.map((benefit) => (
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

          <div className="text-center mt-10">
            <Link to="/register">
              <Button variant="outline" size="lg" className="group text-sm px-8 h-12 border-accent/20 text-foreground hover:border-accent hover:bg-accent/5">
                Get Started <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform text-accent" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
