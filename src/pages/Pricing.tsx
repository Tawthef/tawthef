import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import PricingCard from "@/components/pricing/PricingCard";
import { useProfile } from "@/hooks/useProfile";
import { usePlans } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Pricing = () => {
    const { profile } = useProfile();
    const { plans, isLoading } = usePlans();
    const { toast } = useToast();
    const navigate = useNavigate();

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
                description: "Organization not found",
                variant: "destructive",
            });
            return;
        }

        try {
            // Find the plan
            const plan = plans.find(p => p.slug === planSlug);
            if (!plan) throw new Error('Plan not found');

            // Calculate end date
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + plan.duration_days);

            // Create subscription (mock purchase)
            const { data: subscription, error: subError } = await supabase
                .from('subscriptions')
                .insert({
                    organization_id: profile.organization_id,
                    plan_id: plan.id,
                    status: 'active',
                    end_date: endDate.toISOString(),
                    remaining_slots: plan.job_slots,
                })
                .select()
                .single();

            if (subError) throw subError;

            // If resume access, create resume_access record
            if (plan.type === 'resume_access') {
                const { error: resumeError } = await supabase
                    .from('resume_access')
                    .insert({
                        organization_id: profile.organization_id,
                        subscription_id: subscription.id,
                        end_date: endDate.toISOString(),
                    });

                if (resumeError) throw resumeError;
            }

            toast({
                title: "Purchase Successful!",
                description: `You now have access to ${plan.name}`,
            });

            // Redirect to billing dashboard
            navigate('/dashboard/billing');
        } catch (error) {
            console.error('[Purchase] Error:', error);
            toast({
                title: "Purchase Failed",
                description: "Please try again later",
                variant: "destructive",
            });
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
