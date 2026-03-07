import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock, Shield, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import logo from "@/assets/tawthef-logo-en.png";

const AdminLogin = () => {
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
                if (authError.message?.includes("Invalid login credentials")) {
                    setError("Invalid email or password.");
                } else if (authError.message?.toLowerCase().includes("suspended")) {
                    setError("This account is suspended. Please contact support.");
                } else {
                    setError("Authentication failed. Please try again.");
                }
                setIsLoading(false);
                return;
            }

            // Navigate — RoleProtectedRoute on /dashboard/admin/overview enforces admin role
            navigate("/dashboard/admin/overview");
            setIsLoading(false);

        } catch {
            setIsLoading(false);
            setError("Something went wrong. Please try again.");
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[hsl(224,25%,6%)] relative overflow-hidden px-4">

            {/* Background grid pattern */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(hsl(220,80%,70%) 1px, transparent 1px), linear-gradient(90deg, hsl(220,80%,70%) 1px, transparent 1px)`,
                    backgroundSize: "60px 60px",
                }}
            />

            {/* Radial glow */}
            <div className="absolute inset-0 bg-gradient-radial from-primary/8 via-transparent to-transparent" />

            {/* Decorative orbs */}
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[hsl(280,60%,50%)]/5 rounded-full blur-3xl pointer-events-none" />

            {/* Card */}
            <div className="relative w-full max-w-[420px] space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <img src={logo} alt="Tawthef" className="h-16 w-auto" />
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                            <Shield className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-medium text-primary tracking-wider uppercase">Admin Portal</span>
                        </div>
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">System Administration</h1>
                        <p className="text-sm text-white/40 mt-1">Restricted access — authorized personnel only</p>
                    </div>
                </div>

                {/* Form card */}
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="admin-email" className="text-sm font-medium text-white/60">
                                Admin Email
                            </Label>
                            <Input
                                id="admin-email"
                                type="email"
                                placeholder="admin@tawthef.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                className="h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="admin-password" className="text-sm font-medium text-white/60">
                                Password
                            </Label>
                            <div className="relative">
                                <Input
                                    id="admin-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    className="h-11 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/25 focus:border-primary/50 focus:ring-1 focus:ring-primary/30 pr-10 transition-all"
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-destructive/15 border border-destructive/20">
                                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                                <p className="text-sm text-destructive">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all mt-2"
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <Lock className="w-4 h-4 animate-pulse" />
                                    Authenticating...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <Shield className="w-4 h-4" />
                                    Sign In to Admin Panel
                                </span>
                            )}
                        </Button>
                    </form>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-white/20">
                    This portal is restricted to platform administrators only. <br />
                    Unauthorized access attempts are logged.
                </p>
            </div>
        </div>
    );
};

export default AdminLogin;
