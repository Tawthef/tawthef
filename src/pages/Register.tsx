import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Eye, EyeOff, Mail, Lock, User, Building2, Users, Briefcase, ArrowRight, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/tawthef-logo-en.png";

type UserRole = "candidate" | "agency" | "employer";
type InitialRole = "candidate" | "recruiter";
type RecruiterType = "employer" | "agency";

const Register = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialRole, setInitialRole] = useState<InitialRole | null>(null);
  const [recruiterType, setRecruiterType] = useState<RecruiterType | null>(null);
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "", companyName: "" });

  // Get final role for backend
  const getFinalRole = (): UserRole => {
    if (initialRole === "candidate") return "candidate";
    if (initialRole === "recruiter" && recruiterType) return recruiterType;
    return "candidate"; // fallback
  };

  const initialRoles = [
    { id: "candidate" as InitialRole, title: "Candidate", description: "Discover and apply to opportunities", icon: User, color: "from-primary/15 to-primary/5" },
    { id: "recruiter" as InitialRole, title: "Recruiter", description: "Source and place talent for employers", icon: Users, color: "from-accent/15 to-accent/5" },
  ];

  const recruiterTypes = [
    { id: "employer" as RecruiterType, title: "Employer", description: "Hiring for my own company", icon: Building2, color: "from-primary/15 to-primary/5" },
    { id: "agency" as RecruiterType, title: "Recruitment Agency", description: "Placing candidates for clients", icon: Briefcase, color: "from-accent/15 to-accent/5" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Step 1: Initial role selection
    if (step === 1 && initialRole) {
      if (initialRole === "candidate") {
        setStep(2); // Go directly to account details
      } else if (initialRole === "recruiter") {
        setStep(1.5); // Go to recruiter type selection
      }
      return;
    }

    // Step 1.5: Recruiter type selection
    if (step === 1.5 && recruiterType) {
      setStep(2); // Go to account details
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Call Supabase signup with metadata
      const { error: authError } = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        role: getFinalRole(), // 'candidate' | 'employer' | 'agency'
        company_name: formData.companyName, // For trigger to create organization
      });

      if (authError) {
        // Map Supabase errors to user-friendly messages
        if (authError.message?.includes('already registered')) {
          setError('An account with this email already exists');
        } else if (authError.message?.includes('Password')) {
          setError('Password must be at least 6 characters');
        } else {
          setError('Something went wrong. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      // Success - navigate to dashboard
      // Note: Profile creation will be added in Phase 4
      navigate("/dashboard");
    } catch {
      // Fallback to mock behavior if Supabase fails completely
      console.warn('[Auth] Supabase unavailable, using mock register');
      setTimeout(() => {
        setIsLoading(false);
        navigate("/dashboard");
      }, 1000);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-24 gradient-section">
        <div className="mx-auto w-full max-w-lg">
          {/* Logo - Centered & Authoritative */}
          <div className="flex justify-center mb-8">
            <Link to="/">
              <img src={logo} alt="Tawthef" className="h-24 w-auto" />
            </Link>
          </div>

          {/* Progress indicator - minimal & centered */}
          <div className="flex justify-center items-center gap-3 mb-10">
            <div className={cn("h-1.5 rounded-full transition-all duration-500", step === 1 ? "w-12 bg-primary" : "w-12 bg-primary/20")} />
            <div className={cn("h-1.5 rounded-full transition-all duration-500", step === 1.5 ? "w-12 bg-primary" : step > 1.5 ? "w-12 bg-primary/20" : "w-2 bg-primary/20")} />
            <div className={cn("h-1.5 rounded-full transition-all duration-500", step === 2 ? "w-12 bg-primary" : "w-2 bg-primary/20")} />
          </div>

          {step === 1 ? (
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-semibold text-foreground tracking-tight">
                  How will you use Tawthef?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Choose the option that best describes you
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <RadioGroup value={initialRole || ""} onValueChange={(value) => setInitialRole(value as InitialRole)} className="grid gap-4">
                  {initialRoles.map((role) => (
                    <div key={role.id}>
                      <RadioGroupItem value={role.id} id={role.id} className="peer sr-only" />
                      <Label
                        htmlFor={role.id}
                        className={cn(
                          "flex items-center gap-5 p-5 rounded-xl cursor-pointer transition-all duration-300 border-2",
                          "hover:border-primary/40 hover:bg-muted/40",
                          initialRole === role.id
                            ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/10"
                            : "border-dotted border-border/60 bg-card/40 hover:border-solid"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300",
                          initialRole === role.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          <role.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p className={cn("font-medium text-base transition-colors", initialRole === role.id ? "text-primary" : "text-foreground")}>
                            {role.title}
                          </p>
                          <p className="text-sm text-muted-foreground/80 mt-0.5 font-normal">
                            {role.description}
                          </p>
                        </div>
                        {initialRole === role.id && (
                          <CheckCircle className="w-5 h-5 text-primary animate-fade-in" />
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <Button
                  type="submit"
                  className="w-full h-10 text-sm rounded-md font-semibold shadow-sm transition-all"
                  disabled={!initialRole}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </div>
          ) : step === 1.5 ? (
            <div className="space-y-8">
              <div>
                <button
                  onClick={() => setStep(1)}
                  className="text-xs text-muted-foreground hover:text-foreground mb-6 inline-flex items-center font-medium transition-colors"
                >
                  ← Back
                </button>
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-semibold text-foreground tracking-tight">
                    What type of recruiter are you?
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    This helps us customize your experience
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <RadioGroup value={recruiterType || ""} onValueChange={(value) => setRecruiterType(value as RecruiterType)} className="grid gap-4">
                  {recruiterTypes.map((type) => (
                    <div key={type.id}>
                      <RadioGroupItem value={type.id} id={type.id} className="peer sr-only" />
                      <Label
                        htmlFor={type.id}
                        className={cn(
                          "flex items-center gap-5 p-5 rounded-xl cursor-pointer transition-all duration-300 border-2",
                          "hover:border-primary/40 hover:bg-muted/40",
                          recruiterType === type.id
                            ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary/10"
                            : "border-dotted border-border/60 bg-card/40 hover:border-solid"
                        )}
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-300",
                          recruiterType === type.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          <type.icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p className={cn("font-medium text-base transition-colors", recruiterType === type.id ? "text-primary" : "text-foreground")}>
                            {type.title}
                          </p>
                          <p className="text-sm text-muted-foreground/80 mt-0.5 font-normal">
                            {type.description}
                          </p>
                        </div>
                        {recruiterType === type.id && (
                          <CheckCircle className="w-5 h-5 text-primary animate-fade-in" />
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                <Button
                  type="submit"
                  className="w-full h-10 text-sm rounded-md font-semibold shadow-sm transition-all"
                  disabled={!recruiterType}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-8">
              <div>
                <button
                  onClick={() => initialRole === "recruiter" ? setStep(1.5) : setStep(1)}
                  className="text-xs text-muted-foreground hover:text-foreground mb-6 inline-flex items-center font-medium transition-colors"
                >
                  ← Back
                </button>
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-semibold text-foreground tracking-tight">
                    Create account
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {initialRole === "candidate" ? "Start your job search today" :
                      recruiterType === "agency" ? "Set up your agency profile" :
                        "Configure your company workspace"}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-sm font-medium text-foreground/80">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      className="pl-10 h-11 rounded-lg border-border/40 text-sm focus:border-primary/50 focus:ring-primary/20 transition-all"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {initialRole === "recruiter" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="companyName" className="text-sm font-medium text-foreground/80">
                      {recruiterType === "agency" ? "Agency Name" : "Company Name"}
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                      <Input
                        id="companyName"
                        type="text"
                        placeholder={recruiterType === "agency" ? "Acme Recruiting" : "Acme Corporation"}
                        className="pl-10 h-11 rounded-lg border-border/40 text-sm focus:border-primary/50 focus:ring-primary/20 transition-all"
                        value={formData.companyName}
                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground/80">Work Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      className="pl-10 h-11 rounded-lg border-border/40 text-sm focus:border-primary/50 focus:ring-primary/20 transition-all"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground/80">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a secure password"
                      className="pl-10 pr-10 h-11 rounded-lg border-border/40 text-sm focus:border-primary/50 focus:ring-primary/20 transition-all"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full h-10 text-sm rounded-md font-semibold shadow-sm"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create account"}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground/60">
                    By continuing, you agree to our{" "}
                    <Link to="/terms" className="text-primary hover:underline font-medium">Terms</Link>
                    {" "}and{" "}
                    <Link to="/privacy" className="text-primary hover:underline font-medium">Privacy Policy</Link>
                  </p>
                </div>
              </form>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 gradient-cta-dark relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-[hsl(255,60%,55%)]/10" />

        <div className="relative flex flex-col justify-center px-16 xl:px-24">
          <div className="space-y-12">
            {[
              { icon: Briefcase, title: "Quality First", desc: "Two-level shortlisting ensures only vetted candidates reach you" },
              { icon: Users, title: "Transparent Collaboration", desc: "Clear workflows between employers, agencies, and experts" },
              { icon: Building2, title: "Enterprise Ready", desc: "Multi-tenant architecture with complete data isolation" }
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-5">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center backdrop-blur-sm flex-shrink-0 border border-white/5">
                  <item.icon className="w-6 h-6 text-accent/90" />
                </div>
                <div className="space-y-1.5 pt-0.5">
                  <p className="font-semibold text-white text-lg">{item.title}</p>
                  <p className="text-sm text-white/50 font-light leading-relaxed max-w-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute top-20 right-20 w-32 h-32 border border-white/5 rounded-full opacity-50" />
        <div className="absolute bottom-20 left-16 w-48 h-48 border border-white/5 rounded-full opacity-50" />
      </div>
    </div>
  );
};

export default Register;
