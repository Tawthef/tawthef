import { Briefcase, Users, Building, CheckCircle2 } from "lucide-react";

const WhatIsTawthef = () => {
  const features = [
    {
      icon: Briefcase,
      title: "Enterprise ATS",
      description: "A complete recruitment operating system for organizations that demand structure and accountability.",
      gradient: "from-primary/15 to-primary/5",
      iconColor: "text-primary",
    },
    {
      icon: Users,
      title: "Agency Collaboration",
      description: "Structured workflows for employers and agencies to work together with full transparency.",
      gradient: "from-[hsl(235,75%,50%)]/15 to-[hsl(235,75%,50%)]/5",
      iconColor: "text-[hsl(235,75%,50%)]",
    },
    {
      icon: Building,
      title: "Multi-Tenant Isolation",
      description: "Complete data separation between organizations with enterprise-grade access control.",
      gradient: "from-[hsl(255,60%,55%)]/15 to-[hsl(255,60%,55%)]/5",
      iconColor: "text-[hsl(255,60%,55%)]",
    },
    {
      icon: CheckCircle2,
      title: "Quality Gates",
      description: "Mandatory two-level shortlisting ensures only vetted candidates reach final review.",
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
          <p className="text-subhead max-w-2xl mx-auto">
            An enterprise platform combining Applicant Tracking with Agency Collaboration —
            built for accountability in hiring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group card-float p-10 lg:p-12"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                <feature.icon className={`w-8 h-8 ${feature.iconColor}`} />
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
