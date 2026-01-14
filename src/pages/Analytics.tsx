import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Clock, Users, TrendingUp, Award, Loader2 } from "lucide-react";
import { useAnalyticsSummary } from "@/hooks/useAnalytics";
import { useProfile } from "@/hooks/useProfile";

const stageLabels: Record<string, string> = {
    applied: "Applied",
    agency_shortlisted: "Shortlisted",
    employer_review: "In Review",
    technical_approved: "Tech Approved",
    interview_completed: "Interviewed",
    offer_sent: "Offer Sent",
    offer_accepted: "Hired",
};

const Analytics = () => {
    const { summary, funnel, agencyPerformance, isLoading } = useAnalyticsSummary();
    const { profile } = useProfile();

    const isEmployer = profile?.role === 'employer';
    const isAgency = profile?.role === 'agency';
    const isAdmin = profile?.role === 'admin';

    // Aggregate funnel data across all jobs for summary
    const aggregatedFunnel = Object.entries(
        funnel.reduce((acc, stage) => {
            acc[stage.stage] = (acc[stage.stage] || 0) + stage.candidate_count;
            return acc;
        }, {} as Record<string, number>)
    ).sort((a, b) => {
        const order = ['applied', 'agency_shortlisted', 'employer_review', 'technical_approved', 'interview_completed', 'offer_sent', 'offer_accepted'];
        return order.indexOf(a[0]) - order.indexOf(b[0]);
    });

    const maxFunnelValue = Math.max(...aggregatedFunnel.map(([, count]) => count), 1);

    return (
        <DashboardLayout>
            <div className="space-y-14">
                {/* Page header */}
                <div className="space-y-3">
                    <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">Analytics</h1>
                    <p className="text-xl text-muted-foreground font-light max-w-xl">
                        {isAgency ? "Track your recruiting performance" : "Monitor hiring metrics and team performance"}
                    </p>
                </div>

                {/* Loading state */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* KPI Cards */}
                {!isLoading && (isEmployer || isAdmin) && (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="card-float border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Users className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Applications</p>
                                        <p className="text-2xl font-bold text-foreground">{summary.totalApplications}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="card-float border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                                        <Award className="w-6 h-6 text-success" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Hires</p>
                                        <p className="text-2xl font-bold text-foreground">{summary.totalHires}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="card-float border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                                        <Clock className="w-6 h-6 text-accent" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Avg Time to Hire</p>
                                        <p className="text-2xl font-bold text-foreground">{summary.avgTimeToHire} days</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="card-float border-0">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                                        <TrendingUp className="w-6 h-6 text-warning" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Top Agency Rate</p>
                                        <p className="text-2xl font-bold text-foreground">{summary.topAgencyConversion}%</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Hiring Funnel */}
                {!isLoading && (isEmployer || isAdmin) && aggregatedFunnel.length > 0 && (
                    <Card className="card-float border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <BarChart3 className="w-5 h-5 text-primary" />
                                Hiring Funnel
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                {aggregatedFunnel.map(([stage, count]) => (
                                    <div key={stage} className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">{stageLabels[stage] || stage}</span>
                                            <span className="font-semibold text-foreground">{count}</span>
                                        </div>
                                        <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                                                style={{ width: `${(count / maxFunnelValue) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Agency Performance */}
                {!isLoading && (isEmployer || isAgency || isAdmin) && agencyPerformance.length > 0 && (
                    <Card className="card-float border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <Award className="w-5 h-5 text-success" />
                                {isAgency ? "Your Performance" : "Agency Performance"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border/30">
                                            <th className="text-left text-sm font-medium text-muted-foreground py-3">Period</th>
                                            <th className="text-right text-sm font-medium text-muted-foreground py-3">Submitted</th>
                                            <th className="text-right text-sm font-medium text-muted-foreground py-3">Shortlisted</th>
                                            <th className="text-right text-sm font-medium text-muted-foreground py-3">Approved</th>
                                            <th className="text-right text-sm font-medium text-muted-foreground py-3">Hired</th>
                                            <th className="text-right text-sm font-medium text-muted-foreground py-3">Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {agencyPerformance.slice(0, 10).map((perf, idx) => (
                                            <tr key={idx} className="border-b border-border/10">
                                                <td className="py-4 text-sm text-foreground">
                                                    {new Date(perf.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="py-4 text-sm text-foreground text-right">{perf.candidates_submitted}</td>
                                                <td className="py-4 text-sm text-foreground text-right">{perf.shortlisted_count}</td>
                                                <td className="py-4 text-sm text-foreground text-right">{perf.employer_approved}</td>
                                                <td className="py-4 text-sm text-foreground text-right">{perf.hired_count}</td>
                                                <td className="py-4 text-right">
                                                    <Badge className={`border-0 ${perf.conversion_rate >= 20 ? 'bg-success/10 text-success' : perf.conversion_rate >= 10 ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
                                                        {perf.conversion_rate}%
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Empty state for candidates */}
                {!isLoading && profile?.role === 'candidate' && (
                    <Card className="border-dashed">
                        <CardContent className="p-16 text-center">
                            <BarChart3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">Analytics not available</h3>
                            <p className="text-muted-foreground">
                                Analytics are available for employers and agencies.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Empty state when no data */}
                {!isLoading && (isEmployer || isAdmin) && summary.totalApplications === 0 && aggregatedFunnel.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-16 text-center">
                            <BarChart3 className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No analytics data yet</h3>
                            <p className="text-muted-foreground">
                                Analytics will appear once you have applications and hiring activity.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Analytics;
