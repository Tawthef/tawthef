import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSubscription } from "@/hooks/useSubscription";
import { useJobSlots } from "@/hooks/useJobSlots";
import { useResumeAccess } from "@/hooks/useResumeAccess";
import { Loader2, CreditCard, Calendar, TrendingUp, Lock, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
};

const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
};

const Billing = () => {
    const { subscriptions, isLoading } = useSubscription();
    const { hasAvailableSlots, remainingSlots, totalSlots, expiresAt } = useJobSlots();
    const { hasResumeAccess, expiresAt: resumeExpiresAt } = useResumeAccess();

    const jobPostingSubscription = subscriptions.find(sub => sub.plans?.type === 'job_posting');
    const resumeSubscription = subscriptions.find(sub => sub.plans?.type === 'resume_access');

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Page Header */}
                <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                        Billing & Subscriptions
                    </h1>
                    <p className="text-lg text-muted-foreground mt-2">
                        Manage your packages and view usage
                    </p>
                </div>

                {/* No Active Subscriptions */}
                {subscriptions.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-12 text-center">
                            <CreditCard className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                                No Active Subscriptions
                            </h3>
                            <p className="text-muted-foreground mb-6">
                                Get started by choosing a package that fits your hiring needs
                            </p>
                            <Link to="/pricing">
                                <Button>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    View Pricing
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Active Subscriptions */}
                {subscriptions.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Job Posting Subscription */}
                        {jobPostingSubscription && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-lg font-semibold">
                                                {jobPostingSubscription.plans.name}
                                            </CardTitle>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Expires {formatDate(jobPostingSubscription.end_date)}
                                            </p>
                                        </div>
                                        <Badge className="bg-success/10 text-success border-success/20">
                                            Active
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Slots Progress */}
                                    <div>
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium text-foreground">Job Slots</span>
                                            <span className="text-muted-foreground">
                                                {remainingSlots} / {totalSlots} remaining
                                            </span>
                                        </div>
                                        <Progress
                                            value={(remainingSlots / totalSlots) * 100}
                                            className="h-2"
                                        />
                                    </div>

                                    {/* Days Remaining */}
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">
                                            {getDaysRemaining(jobPostingSubscription.end_date)} days remaining
                                        </span>
                                    </div>

                                    {/* Status */}
                                    {!hasAvailableSlots && (
                                        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                                            <p className="text-sm text-warning font-medium">
                                                No slots available. Close existing jobs or upgrade your plan.
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Resume Search Subscription */}
                        {resumeSubscription && (
                            <Card>
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-lg font-semibold">
                                                {resumeSubscription.plans.name}
                                            </CardTitle>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                Expires {formatDate(resumeSubscription.end_date)}
                                            </p>
                                        </div>
                                        <Badge className="bg-success/10 text-success border-success/20">
                                            Active
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* Access Status */}
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                                            <Lock className="w-6 h-6 text-success" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">Full Access</p>
                                            <p className="text-sm text-muted-foreground">
                                                Search and view candidate profiles
                                            </p>
                                        </div>
                                    </div>

                                    {/* Days Remaining */}
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-muted-foreground">
                                            {getDaysRemaining(resumeSubscription.end_date)} days remaining
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Upgrade CTA */}
                <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <TrendingUp className="w-7 h-7 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-foreground">
                                        Need more job slots or resume access?
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        Upgrade your plan to unlock more features
                                    </p>
                                </div>
                            </div>
                            <Link to="/pricing">
                                <Button size="lg" className="shadow-lg shadow-primary/20">
                                    View Pricing
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default Billing;
