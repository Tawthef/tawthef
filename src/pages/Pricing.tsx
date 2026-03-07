import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PricingCard from "@/components/pricing/PricingCard";
import { useProfile } from "@/hooks/useProfile";
import { usePlans } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

const Pricing = () => {
    const { profile } = useProfile();
    const { plans, isLoading } = usePlans();
    const { toast } = useToast();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

    const canPurchase = profile && ['employer', 'agency', 'admin'].includes(profile.role);

    const handlePurchase = async (planSlug: string) => {
        if (!canPurchase) {
            toast({
                title: "Recruiter Only",
                description: "Only recruiters can purchase packages",
                variant: "destructive",
            });
            return;
        }

        if (!profile?.organization_id) {
            toast({
                title: "Error",
                description: "Recruiter account not found. Please complete account setup.",
                variant: "destructive",
            });
            return;
        }

        setLoadingPlan(planSlug);

        try {
            // Get current auth token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error('Not authenticated');

            // Call serverless function to create Stripe checkout session
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ plan_type: planSlug }),
            });

            const data = await response.json();

            if (!response.ok || !data.url) {
                throw new Error(data.error || 'Failed to create payment session');
            }

            // Redirect to Stripe Checkout
            window.location.href = data.url;

        } catch (error: any) {
            console.error('[Purchase] Error:', error);
            toast({
                title: "Payment Error",
                description: error.message || "Could not start payment. Please try again.",
                variant: "destructive",
            });
            setLoadingPlan(null);
        }
    };


    const getDuration = (days: number) => {
        if (days === 30) return '30 days';
        if (days === 90) return '90 days';
        return `${days} days`;
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />

            {/* Hero Section */}
            <section className="py-20 lg:py-28 gradient-section">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm border border-primary/20 rounded-full px-5 py-2 mb-6">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <span className="text-sm font-medium text-primary">For Recruiters</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground tracking-tight mb-6">
                            Simple, Transparent Pricing
                        </h1>
                        <p className="text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto">
                            Choose the perfect plan for your hiring needs. No hidden fees, no surprises.
                        </p>
                    </div>
                </div>
            </section>

            {/* Pricing Cards */}
            <section className="py-16 lg:py-24">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                            {plans.map((plan, index) => (
                                <PricingCard
                                    key={plan.id}
                                    name={plan.name}
                                    price={plan.price}
                                    duration={getDuration(plan.duration_days)}
                                    features={plan.features || []}
                                    featured={index === 1} // Growth plan is featured
                                    onPurchase={() => handlePurchase(plan.slug)}
                                    disabled={!canPurchase}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* FAQ or Additional Info */}
            <section className="py-16 bg-muted/30">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl mx-auto text-center">
                        <h2 className="text-3xl font-bold text-foreground mb-4">
                            Ready to streamline your hiring?
                        </h2>
                        <p className="text-muted-foreground mb-8">
                            All plans include full access to our applicant tracking system, candidate shortlisting, and dedicated support.
                        </p>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
};

export default Pricing;
