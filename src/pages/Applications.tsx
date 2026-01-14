import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Briefcase, Loader2, Calendar, Building2, Filter } from "lucide-react";
import { useCandidateApplications } from "@/hooks/useCandidateDashboard";
import { Link } from "react-router-dom";
import { useState } from "react";

const statusConfig: Record<string, { label: string; className: string; order: number }> = {
    applied: { label: "Applied", className: "bg-muted text-muted-foreground", order: 1 },
    agency_shortlisted: { label: "Shortlisted", className: "bg-primary/10 text-primary", order: 2 },
    employer_review: { label: "In Review", className: "bg-accent/10 text-accent", order: 3 },
    technical_approved: { label: "Tech Approved", className: "bg-success/10 text-success", order: 4 },
    interview_scheduled: { label: "Interview", className: "bg-warning/10 text-warning", order: 5 },
    offer_sent: { label: "Offer Pending", className: "bg-success/20 text-success", order: 6 },
    hired: { label: "Hired", className: "bg-success text-success-foreground", order: 7 },
    rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive", order: 8 },
};

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const Applications = () => {
    const { data: applications, isLoading } = useCandidateApplications();
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const filteredApplications = statusFilter === 'all'
        ? applications
        : applications?.filter(app => app.status === statusFilter);

    const activeCount = applications?.filter(app => !['hired', 'rejected'].includes(app.status)).length || 0;
    const hiredCount = applications?.filter(app => app.status === 'hired').length || 0;

    return (
        <DashboardLayout>
            <div className="space-y-10">
                {/* Page header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-3">
                        <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">My Applications</h1>
                        <p className="text-xl text-muted-foreground font-light max-w-xl">
                            Track your job applications and their status
                        </p>
                    </div>
                    <Link to="/dashboard/jobs">
                        <Button className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20">
                            <Briefcase className="w-4 h-4 mr-2" />
                            Browse Jobs
                        </Button>
                    </Link>
                </div>

                {/* Stats row */}
                {!isLoading && applications && applications.length > 0 && (
                    <div className="flex flex-wrap gap-4">
                        <Badge variant="outline" className="px-4 py-2 text-sm">
                            {applications.length} Total
                        </Badge>
                        <Badge variant="outline" className="px-4 py-2 text-sm bg-primary/5">
                            {activeCount} Active
                        </Badge>
                        {hiredCount > 0 && (
                            <Badge className="px-4 py-2 text-sm bg-success/10 text-success border-0">
                                {hiredCount} Hired
                            </Badge>
                        )}
                    </div>
                )}

                {/* Filter */}
                {!isLoading && applications && applications.length > 0 && (
                    <Card className="card-float border-0">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <Filter className="w-5 h-5 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">Filter:</span>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-40 h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="applied">Applied</SelectItem>
                                        <SelectItem value="agency_shortlisted">Shortlisted</SelectItem>
                                        <SelectItem value="employer_review">In Review</SelectItem>
                                        <SelectItem value="hired">Hired</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Badge variant="outline" className="ml-auto">
                                    {filteredApplications?.length || 0} results
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Loading state */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && (!applications || applications.length === 0) && (
                    <Card className="border-dashed">
                        <CardContent className="p-16 text-center">
                            <FileText className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No applications yet</h3>
                            <p className="text-muted-foreground mb-6">
                                Start applying to jobs to track your progress here.
                            </p>
                            <Link to="/dashboard/jobs">
                                <Button className="shadow-lg shadow-primary/20">
                                    <Briefcase className="w-4 h-4 mr-2" />
                                    Browse Jobs
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}

                {/* Applications list */}
                {!isLoading && filteredApplications && filteredApplications.length > 0 && (
                    <div className="space-y-4">
                        {filteredApplications.map((app) => {
                            const status = statusConfig[app.status] || statusConfig.applied;
                            return (
                                <Card key={app.id} className="card-float border-0 overflow-hidden hover:shadow-lg transition-shadow">
                                    <CardContent className="p-6 lg:p-8">
                                        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                                            {/* Job info */}
                                            <div className="flex items-center gap-5 flex-1">
                                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/12 to-primary/4 flex items-center justify-center flex-shrink-0">
                                                    <Briefcase className="w-7 h-7 text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-lg font-semibold text-foreground truncate">{app.job_title}</h3>
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                                        <span className="flex items-center gap-1.5 truncate">
                                                            <Building2 className="w-4 h-4 flex-shrink-0" />
                                                            {app.company_name}
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <Calendar className="w-4 h-4 flex-shrink-0" />
                                                            {formatDate(app.applied_at)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Status */}
                                            <div className="flex items-center gap-4">
                                                <Badge className={`${status.className} border-0 px-4 py-1.5 text-sm`}>
                                                    {status.label}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Status timeline hint */}
                                        {!['hired', 'rejected'].includes(app.status) && (
                                            <div className="mt-4 pt-4 border-t border-border/30">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary rounded-full transition-all"
                                                            style={{ width: `${(status.order / 7) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                        Step {status.order} of 7
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* No results for filter */}
                {!isLoading && applications && applications.length > 0 && filteredApplications?.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-12 text-center">
                            <Filter className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground">No applications match this filter</p>
                            <Button variant="link" onClick={() => setStatusFilter('all')}>
                                Clear filter
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
};

export default Applications;
