import { Briefcase, Users, Building, CheckCircle2 } from "lucide-react";

const WhatIsTawthef = () => {
  const features = [
    {
      icon: Briefcase,
      title: "Enterprise ATS",
      description: "Secure hiring platform for recruiters managing multi-stage hiring workflows.",
      gradient: "from-primary/15 to-primary/5",
      iconColor: "text-primary",
    },
    {
      icon: Users,
      title: "Agency Collaboration",
      description: "Coordinate recruiters and hiring teams with clear handoffs and shared visibility.",
      gradient: "from-[hsl(235,75%,50%)]/15 to-[hsl(235,75%,50%)]/5",
      iconColor: "text-[hsl(235,75%,50%)]",
    },
    {
      icon: Building,
      title: "Multi-Tenant Isolation",
      description: "Protect company data with strict workspace separation and role-based access.",
      gradient: "from-[hsl(255,60%,55%)]/15 to-[hsl(255,60%,55%)]/5",
      iconColor: "text-[hsl(255,60%,55%)]",
    },
    {
      icon: CheckCircle2,
      title: "Quality Gates",
      description: "Ensure only vetted candidates reach final review with structured quality checks.",
      gradient: "from-accent/15 to-accent/5",
      iconColor: "text-accent",
    },
  ];

  return (
    <section className="py-16 lg:py-24 gradient-section relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center mb-16 lg:mb-20">
          <h2 className="text-headline text-foreground mb-8">
            What is <span className="text-primary">Tawthef</span>?
          </h2>
          <p className="text-subhead max-w-2xl mx-auto leading-relaxed">
            An enterprise platform combining Applicant Tracking with Agency Collaboration -
            built for accountability in hiring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group card-float p-10 lg:p-12 hover:-translate-y-1 transition-transform"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                <feature.icon className={`w-8 h-8 ${feature.iconColor} opacity-90 group-hover:opacity-100 transition-all`} />
              </div>
              <h3 className="text-xl lg:text-2xl font-semibold text-foreground mb-4">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed text-base lg:text-lg font-light">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhatIsTawthef;
