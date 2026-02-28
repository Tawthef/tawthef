import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Loader2, ArrowRight, Briefcase, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import logo from "@/assets/tawthef-logo-en.png";

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const queryClient = useQueryClient();
    const [isVerifying, setIsVerifying] = useState(true);

    useEffect(() => {
        // Give webhook time to process, then invalidate subscription caches
        const timer = setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ["subscription"] });
            queryClient.invalidateQueries({ queryKey: ["employer-dashboard-stats"] });
            queryClient.invalidateQueries({ queryKey: ["agency-dashboard-stats"] });
            setIsVerifying(false);
        }, 2500);
        return () => clearTimeout(timer);
    }, [queryClient]);

    return (
        <div className="min-h-screen bg-[hsl(224,25%,6%)] flex items-center justify-center px-4 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-radial from-success/5 via-transparent to-transparent" />
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-success/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-md text-center space-y-8">
                {/* Logo */}
                <div className="flex justify-center">
                    <img src={logo} alt="Tawthef" className="h-12 w-auto opacity-80" />
                </div>

                {/* Success card */}
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-xl p-10 shadow-2xl space-y-6">
                    {isVerifying ? (
                        <div className="space-y-4">
                            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            </div>
                            <h1 className="text-2xl font-bold text-white">Processing Payment...</h1>
                            <p className="text-white/40 text-sm">Please wait while we confirm your subscription.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Animated checkmark */}
                            <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mx-auto ring-4 ring-success/20">
                                <CheckCircle className="w-10 h-10 text-success" />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
                                <p className="text-white/50 text-sm">
                                    Your subscription is now active.
                                    {sessionId && (
                                        <span className="block mt-1 text-xs text-white/25 font-mono">
                                            Ref: {sessionId.slice(-12)}
                                        </span>
                                    )}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <Link to="/dashboard">
                                    <Button className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                                        <Briefcase className="w-4 h-4 mr-2" />
                                        Go to Dashboard
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                                <Link to="/dashboard/jobs">
                                    <Button variant="outline" className="w-full h-11 rounded-xl border-white/10 text-white hover:bg-white/5">
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Post a Job Now
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-white/20 text-xs">
                    Questions? Contact support@tawthef.com
                </p>
            </div>
        </div>
    );
};

export default PaymentSuccess;
