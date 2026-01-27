import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Calendar, Award, CheckCircle, Clock, Download, BarChart3, Briefcase } from "lucide-react";
import { useRecruiterAnalytics } from "@/hooks/useRecruiterAnalytics";
import { useProfile } from "@/hooks/useProfile";
import { Navigate } from "react-router-dom";
import KPICard from "@/components/reports/KPICard";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Reports = () => {
    const { profile } = useProfile();
    const { kpis, funnelSeries, funnelCategories, jobsBreakdown, isLoading } = useRecruiterAnalytics();

    // Access Control: Only Employer and Agency
    if (profile?.role === 'candidate') {
        return <Navigate to="/dashboard" replace />;
    }

    if (isLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    const funnelData = funnelCategories.map((cat, index) => ({
        name: cat,
        value: funnelSeries[0].data[index]
    }));

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-foreground tracking-tight">Candidates Progress Report</h1>
                        <p className="text-muted-foreground">Real-time insights into your hiring pipeline.</p>
                    </div>
                    <Button variant="outline" className="w-full sm:w-auto">
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </Button>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    <KPICard label="Total Applicants" value={kpis.totalApplicants} icon={Users} color="primary" />
                    <KPICard label="Shortlisted" value={kpis.shortlisted} icon={TrendingUp} color="accent" />
                    <KPICard label="In Interview" value={kpis.inInterview} icon={Calendar} color="warning" />
                    <KPICard label="Offers Sent" value={kpis.offersSent} icon={Award} color="success" />
                    <KPICard label="Hired" value={kpis.hired} icon={CheckCircle} color="success" />
                    <KPICard label="Avg Time to Hire" value={`${kpis.avgTimeToHire}d`} icon={Clock} color="muted" />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Hiring Funnel Chart */}
                    <Card className="lg:col-span-2 card-float border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-primary" />
                                Hiring Funnel
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[350px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={funnelData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                                        <XAxis
                                            dataKey="name"
                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {funnelData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={`hsl(var(--primary) / ${0.3 + (index * 0.1)})`} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Stats / Highlights */}
                    <Card className="card-float border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-accent" />
                                Pipeline Health
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Shortlist Rate</span>
                                    <span className="font-medium">
                                        {kpis.totalApplicants > 0 ? Math.round((kpis.shortlisted / kpis.totalApplicants) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-accent rounded-full" style={{ width: `${Math.round((kpis.shortlisted / kpis.totalApplicants || 0) * 100)}%` }} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Interview Completion</span>
                                    <span className="font-medium">
                                        {kpis.shortlisted > 0 ? Math.round((kpis.inInterview / kpis.shortlisted) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-warning rounded-full" style={{ width: `${Math.round((kpis.inInterview / kpis.shortlisted || 0) * 100)}%` }} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Offer Acceptance</span>
                                    <span className="font-medium">
                                        {kpis.offersSent > 0 ? Math.round((kpis.hired / kpis.offersSent) * 100) : 0}%
                                    </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-success rounded-full" style={{ width: `${Math.round((kpis.hired / kpis.offersSent || 0) * 100)}%` }} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Job-wise Breakdown Table */}
                <Card className="card-float border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary" />
                            Job-wise Candidate Breakdown
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-border/30 text-left">
                                        <th className="py-3 px-4 font-medium text-sm text-muted-foreground w-[30%]">Job Position</th>
                                        <th className="py-3 px-4 font-medium text-sm text-muted-foreground text-center">Applied</th>
                                        <th className="py-3 px-4 font-medium text-sm text-muted-foreground text-center">Shortlisted</th>
                                        <th className="py-3 px-4 font-medium text-sm text-muted-foreground text-center">Interview</th>
                                        <th className="py-3 px-4 font-medium text-sm text-muted-foreground text-center">Hired</th>
                                        <th className="py-3 px-4 font-medium text-sm text-muted-foreground text-center">Avg Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {jobsBreakdown.length > 0 ? jobsBreakdown.map((job) => (
                                        <tr key={job.jobId} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                                            <td className="py-4 px-4 text-sm font-medium text-foreground">
                                                <div className="flex flex-col">
                                                    <span>{job.jobTitle}</span>
                                                    <Badge variant="outline" className="w-fit mt-1 text-[10px] h-5 px-1.5">{job.status}</Badge>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-sm text-center font-medium">{job.applicants}</td>
                                            <td className="py-4 px-4 text-sm text-center text-muted-foreground">{job.shortlisted}</td>
                                            <td className="py-4 px-4 text-sm text-center text-muted-foreground">{job.interviewing}</td>
                                            <td className="py-4 px-4 text-sm text-center font-semibold text-success">{job.hired}</td>
                                            <td className="py-4 px-4 text-sm text-center text-muted-foreground">{job.avgTime > 0 ? `${job.avgTime}d` : '-'}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No job data available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
};

export default Reports;
