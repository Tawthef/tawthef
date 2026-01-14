import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Briefcase, Loader2, CheckCircle, Clock, Send, Building2, ArrowRight } from "lucide-react";
import { useAgencyApplications } from "@/hooks/useAgencyApplications";
import { useJobs } from "@/hooks/useJobs";
import { useProfile } from "@/hooks/useProfile";
import { useState } from "react";

const statusConfig: Record<string, { label: string; className: string }> = {
    "applied": { label: "Pending Review", className: "bg-muted text-muted-foreground" },
    "agency_shortlisted": { label: "Shortlisted", className: "bg-success/10 text-success" },
    "employer_review": { label: "Employer Reviewing", className: "bg-accent/10 text-accent" },
    "rejected": { label: "Rejected", className: "bg-destructive/10 text-destructive" },
    "hired": { label: "Hired", className: "bg-success/20 text-success" },
};

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

const AgencySubmissions = () => {
    const { applications, isLoading, shortlist, isShortlisting } = useAgencyApplications();
    const { jobs, isLoading: jobsLoading } = useJobs();
    const { profile } = useProfile();
    const [shortlistingId, setShortlistingId] = useState<string | null>(null);

    const isAgency = profile?.role === 'agency';

    const handleShortlist = async (applicationId: string) => {
        setShortlistingId(applicationId);
        try {
            await shortlist(applicationId);
        } catch (err) {
            console.error('[AgencySubmissions] Shortlist error:', err);
        } finally {
            setShortlistingId(null);
        }
    };

    // Filter employer jobs (agencies can submit to any open employer job)
    const employerJobs = jobs.filter(j => j.status === 'open');

    return (
        <DashboardLayout>
            <div className="space-y-14">
                {/* Page header */}
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
                    <div className="space-y-3">
                        <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">Submissions</h1>
                        <p className="text-xl text-muted-foreground font-light max-w-xl">
                            Manage your candidate submissions to employer jobs
                        </p>
                    </div>
                </div>

                {/* Available Jobs Section */}
                {isAgency && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold text-foreground">Available Jobs</h2>
                        {jobsLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : employerJobs.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="p-10 text-center">
                                    <Briefcase className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                                    <p className="text-muted-foreground">No open jobs available</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {employerJobs.slice(0, 6).map((job) => (
                                    <Card key={job.id} className="card-float border-0">
                                        <CardContent className="p-6">
                                            <div className="space-y-3">
                                                <h3 className="font-semibold text-foreground">{job.title}</h3>
                                                {job.organization_name && (
                                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                        <Building2 className="w-4 h-4" />
                                                        {job.organization_name}
                                                    </p>
                                                )}
                                                <Button variant="outline" size="sm" className="w-full rounded-lg" disabled>
                                                    <Send className="w-4 h-4 mr-2" />
                                                    Submit Candidate
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Search */}
                <div className="flex flex-col sm:flex-row gap-5">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                        <Input
                            placeholder="Search submissions..."
                            className="pl-14 h-14 rounded-2xl border-border/30 bg-card/50 text-base focus:bg-card focus:border-border/60 transition-all"
                        />
                    </div>
                </div>

                {/* Loading state */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Empty state */}
                {!isLoading && applications.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="p-16 text-center">
                            <Send className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
                            <h3 className="text-xl font-semibold text-foreground mb-2">No submissions yet</h3>
                            <p className="text-muted-foreground">
                                Submit candidates to employer jobs to see them here.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Submissions list */}
                {!isLoading && applications.length > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-semibold text-foreground">Your Submissions</h2>
                        {applications.map((app) => (
                            <Card key={app.id} className="card-float border-0 overflow-hidden">
                                <CardContent className="p-8 lg:p-10">
                                    <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                                        {/* Candidate info */}
                                        <div className="flex items-center gap-6 flex-1">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/12 to-primary/4 flex items-center justify-center flex-shrink-0">
                                                <span className="text-lg font-bold text-primary">
                                                    {app.candidate_name?.split(" ").map(n => n[0]).join("") || "?"}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-4 flex-wrap">
                                                    <h3 className="text-lg font-semibold text-foreground">{app.candidate_name}</h3>
                                                    <Badge className={statusConfig[app.status]?.className + " border-0 text-xs px-3 py-1 font-medium"}>
                                                        {statusConfig[app.status]?.label || app.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-muted-foreground">{app.job_title}</p>
                                                {app.organization_name && (
                                                    <p className="text-sm text-muted-foreground/60 flex items-center gap-2">
                                                        <Building2 className="w-4 h-4" />
                                                        {app.organization_name}
                                                    </p>
                                                )}
                                                <p className="text-sm text-muted-foreground/60 flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    Submitted {formatDate(app.applied_at)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Actions - only for pending submissions */}
                                        {app.status === 'applied' && (
                                            <Button
                                                className="h-11 px-5 rounded-xl shadow-lg shadow-primary/20"
                                                onClick={() => handleShortlist(app.id)}
                                                disabled={shortlistingId === app.id}
                                            >
                                                {shortlistingId === app.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                        Shortlist for Employer
                                                    </>
                                                )}
                                            </Button>
                                        )}

                                        {/* Status indicator for processed submissions */}
                                        {app.status === 'agency_shortlisted' && (
                                            <div className="flex items-center gap-2 text-success">
                                                <CheckCircle className="w-5 h-5" />
                                                <span className="font-medium">Sent to Employer</span>
                                            </div>
                                        )}

                                        {app.status === 'employer_review' && (
                                            <div className="flex items-center gap-2 text-accent">
                                                <ArrowRight className="w-5 h-5" />
                                                <span className="font-medium">Employer Reviewing</span>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default AgencySubmissions;
