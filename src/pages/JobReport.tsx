import { useParams, Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useJobReport } from '@/hooks/useJobReport';
import { useProfile } from '@/hooks/useProfile';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, TrendingUp, Calendar, CheckCircle, Award, Briefcase } from 'lucide-react';
import KPICard from '@/components/reports/KPICard';
import StatusBreakdownChart from '@/components/reports/StatusBreakdownChart';
import InterviewSuitabilityChart from '@/components/reports/InterviewSuitabilityChart';
import CandidateSourceChart from '@/components/reports/CandidateSourceChart';
import GeographyChart from '@/components/reports/GeographyChart';
import InterviewTimelineChart from '@/components/reports/InterviewTimelineChart';

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

    const { job, kpis, statusBreakdown, interviewSuitability, sources, geography, timeline } = data;

    return (
        <DashboardLayout>
            <div className="space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-4 flex-wrap">
                                <h1 className="text-3xl lg:text-4xl font-bold text-foreground tracking-tight">
                                    {job.title}
                                </h1>
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

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <KPICard
                        label="Total Applicants"
                        value={kpis.total_applicants}
                        icon={Users}
                        color="primary"
                    />
                    <KPICard
                        label="Shortlisted"
                        value={kpis.shortlisted}
                        icon={TrendingUp}
                        color="accent"
                    />
                    <KPICard
                        label="In Interview"
                        value={kpis.in_interview}
                        icon={Calendar}
                        color="warning"
                    />
                    <KPICard
                        label="Offers Sent"
                        value={kpis.offers_sent}
                        icon={Award}
                        color="success"
                    />
                    <KPICard
                        label="Hired"
                        value={kpis.hired}
                        icon={CheckCircle}
                        color="success"
                    />
                </div>

                {/* Charts Grid - 2 columns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <StatusBreakdownChart data={statusBreakdown} />
                    <InterviewSuitabilityChart data={interviewSuitability} />
                    <CandidateSourceChart data={sources} />
                    <GeographyChart data={geography} />
                </div>

                {/* Full-width Timeline */}
                <InterviewTimelineChart data={timeline} />
            </div>
        </DashboardLayout>
    );
};

export default JobReport;
