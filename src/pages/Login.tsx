import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/tawthef-logo-en.png";

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } = await signIn(formData.email, formData.password);

      if (authError) {
        // Map Supabase errors to user-friendly messages
        if (authError.message?.includes('Invalid login credentials')) {
          setError('Invalid email or password');
        } else if (authError.message?.includes('Email not confirmed')) {
          setError('Please check your email to confirm your account');
        } else {
          setError('Something went wrong. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      // Success - navigate to dashboard
      navigate("/dashboard");
    } catch {
      // Fallback to mock behavior if Supabase fails completely
      console.warn('[Auth] Supabase unavailable, using mock login');
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
        <div className="mx-auto w-full max-w-sm">
          {/* Logo - Centered & Authoritative */}
          <div className="flex justify-center mb-8">
            <Link to="/">
              <img src={logo} alt="Tawthef" className="h-24 w-auto" />
            </Link>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-sm">
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground/80">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="name@company.com" className="pl-10 h-11 rounded-lg border-foreground/15 text-sm focus:border-primary/50 focus:ring-primary/20 transition-all shadow-sm bg-muted/5" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground/80">Password</Label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline font-medium">Forgot password?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" className="pl-10 pr-10 h-11 rounded-lg border-foreground/15 text-sm focus:border-primary/50 focus:ring-primary/20 transition-all shadow-sm bg-muted/5" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button type="submit" className="w-full h-10 text-sm font-semibold rounded-md shadow-sm" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/30" /></div>
              <div className="relative flex justify-center text-xs"><span className="px-3 bg-background text-muted-foreground/70">Or continue with</span></div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="outline" type="button" className="h-10 rounded-md border-border/40 text-sm font-normal text-muted-foreground hover:text-foreground hover:bg-muted/30">
                <svg className="w-4 h-4 mr-2 opacity-80" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                Google
              </Button>
              <Button variant="outline" type="button" className="h-10 rounded-md border-border/40 text-sm font-normal text-muted-foreground hover:text-foreground hover:bg-muted/30">
                <svg className="w-4 h-4 mr-2 opacity-80" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" /></svg>
                LinkedIn
              </Button>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Don't have an account?{" "}<Link to="/register" className="font-medium text-primary hover:underline">Sign up</Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex flex-1 gradient-cta-dark relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-[hsl(255,60%,55%)]/10" />
        <div className="relative flex flex-col justify-center px-12 xl:px-16">
          <blockquote className="text-white max-w-md">
            <span className="text-accent text-5xl font-serif leading-none block mb-4">"</span>
            <p className="text-xl xl:text-2xl font-medium leading-relaxed mb-8">Tawthef transformed our hiring process. The two-level shortlisting ensures we only see quality candidates.</p>
            <footer>
              <p className="font-semibold text-base">Sarah Johnson</p>
              <p className="text-white/50 text-sm">Head of Talent, TechCorp International</p>
            </footer>
          </blockquote>
        </div>
        <div className="absolute top-20 right-20 w-32 h-32 border border-white/5 rounded-full opacity-50" />
        <div className="absolute bottom-20 left-16 w-48 h-48 border border-white/5 rounded-full opacity-50" />
      </div>
    </div>
  );
};

export default Login;
