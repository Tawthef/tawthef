import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle } from "lucide-react";

const CTASection = () => {
  const features = [
    "Two-level shortlisting",
    "Agency collaboration",
    "AI-powered matching",
    "GDPR compliant",
  ];

  return (
    <section id="pricing" className="py-24 lg:py-32 relative overflow-hidden gradient-cta-dark">
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px] -z-10" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-tighter mb-6 leading-[1.05]">
            Start Hiring
            <span className="block mt-1">Smarter Today</span>
          </h2>
          <p className="text-xl lg:text-2xl text-white/70 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
            Get your team on Tawthef and see the difference structured hiring makes.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {features.map((feature) => (
              <div
                key={feature}
                className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-5 py-2"
              >
                <CheckCircle className="w-4 h-4 text-white/70" />
                <span className="text-sm font-medium text-white">{feature}</span>
              </div>
            ))}
          </div>

          <div className="h-px w-12 bg-white/10 mx-auto my-8" />

          <div className="w-full max-w-sm sm:max-w-none mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Link to="/register" className="w-full sm:w-auto">
              <Button
                className="w-full sm:w-auto h-12 text-base font-semibold bg-primary text-white shadow-lg transition-all hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] px-8 rounded-xl"
              >
                Get Early Access
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/register" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-12 rounded-xl border border-white/30 text-white bg-transparent transition-all hover:bg-white/10 hover:border-white/50 hover:scale-[1.02] active:scale-[0.98] px-8"
              >
                Request a Demo
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs sm:text-sm text-white/65">
            {["Free for candidates", "No credit card required", "AI powered job matching"].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
