import { useParams, Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useJobReport } from '@/hooks/useJobReport';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, TrendingUp, Calendar, CheckCircle, Award, Briefcase, XCircle, UserCheck, Filter } from 'lucide-react';
import KPICard from '@/components/reports/KPICard';
import StatusBreakdownChart from '@/components/reports/StatusBreakdownChart';
import HiringFunnelChart from '@/components/reports/HiringFunnelChart';
import ApplicationTimelineChart from '@/components/reports/ApplicationTimelineChart';

const getStatusBadge = (status: 'open' | 'closed' | 'draft') => {
    const config = {
        open: { label: 'Open', className: 'bg-success/10 text-success border-success/20' },
        closed: { label: 'Closed', className: 'bg-muted text-muted-foreground border-border' },
        draft: { label: 'Draft', className: 'bg-primary/10 text-primary border-primary/20' },
    };
    const c = config[status];
    return <Badge className={`${c.className} border text-xs px-3 py-1 font-medium`}>{c.label}</Badge>;
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
};

const JobReport = () => {
    const { jobId } = useParams<{ jobId: string }>();
    const { profile } = useProfile();
    const { data, isLoading, error } = useJobReport(jobId);

    // Block candidates from accessing this page
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

    if (error || !data) {
        return (
            <DashboardLayout>
                <Card className="border-destructive/20 bg-destructive/5">
                    <CardContent className="p-8 text-center">
                        <p className="text-destructive">Failed to load job report. Please try again.</p>
                    </CardContent>
                </Card>
            </DashboardLayout>
        );
    }

    const { job, progress, statusBreakdown, funnel, timeline } = data;

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-4 flex-wrap">
                                <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                                    Candidates Progress Report
                                </h1>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                                <h2 className="text-xl text-muted-foreground font-medium">{job.title}</h2>
                                {getStatusBadge(job.status)}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
                                {job.location && (
                                    <span className="flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" />
                                        {job.location}
                                    </span>
                                )}
                                <span className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Posted {formatDate(job.posted_at)}
                                </span>
                                <span className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    {job.total_candidates} {job.total_candidates === 1 ? 'Candidate' : 'Candidates'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* KPI Cards — 7 cards for all statuses */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 lg:gap-6">
                    <KPICard
                        label="Total Applicants"
                        value={progress.total_applications}
                        icon={Users}
                        color="primary"
                    />
                    <KPICard
                        label="Suitable for Interview"
                        value={progress.agency_shortlisted_count + progress.hr_shortlisted_count + progress.technical_shortlisted_count}
                        icon={Filter}
                        color="accent"
                    />
                    <KPICard
                        label="Shortlisted"
                        value={progress.hr_shortlisted_count}
                        icon={TrendingUp}
                        color="primary"
                    />
                    <KPICard
                        label="Technical"
                        value={progress.technical_shortlisted_count}
                        icon={UserCheck}
                        color="accent"
                    />
                    <KPICard
                        label="Interview"
                        value={progress.interview_count}
                        icon={Calendar}
                        color="warning"
                    />
                    <KPICard
                        label="Offers"
                        value={progress.offer_count}
                        icon={Award}
                        color="success"
                    />
                    <KPICard
                        label="Hired"
                        value={progress.hired_count}
                        icon={CheckCircle}
                        color="success"
                    />
                </div>

                {/* Rejected count inline */}
                {progress.rejected_count > 0 && (
                    <Card className="border-destructive/20 bg-destructive/5">
                        <CardContent className="p-4 flex items-center gap-3">
                            <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                            <p className="text-sm font-medium text-foreground">
                                <span className="text-destructive font-bold">{progress.rejected_count}</span> candidate{progress.rejected_count !== 1 ? 's' : ''} rejected
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Hiring Funnel — full width */}
                <HiringFunnelChart data={funnel} />

                {/* Charts Grid — 2 columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Status Breakdown Bar Chart */}
                    <StatusBreakdownChart data={statusBreakdown} />

                    {/* Application Timeline Area Chart */}
                    <ApplicationTimelineChart data={timeline} />
                </div>
            </div>
        </DashboardLayout>
    );
};

export default JobReport;
