import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreHorizontal, Building2, Calendar, Briefcase, Loader2, CheckCircle, Send, BarChart3, AlertTriangle, ClipboardList, Pencil, Trash2, ExternalLink } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useJobs, useDeleteJob, Job } from "@/hooks/useJobs";
import { useProfile } from "@/hooks/useProfile";
import { useApplications } from "@/hooks/useApplications";
import { useJobSlots } from "@/hooks/useJobSlots";
import { useState } from "react";
import { Link } from "react-router-dom";
import UpgradeModal from "@/components/UpgradeModal";
import { useToast } from "@/hooks/use-toast";
import RecruiterVerificationBanner from "@/components/recruiter/RecruiterVerificationBanner";
import { CreateJobDialog } from "@/components/jobs/CreateJobDialog";
import { GenerateClientLinkModal } from "@/components/jobs/GenerateClientLinkModal";

const getStatusBadge = (status: string) => {
  const config: Record<string, { label: string; className: string }> = {
    "open": { label: "Open", className: "bg-success/10 text-success" },
    "closed": { label: "Closed", className: "bg-muted text-muted-foreground" },
    "draft": { label: "Draft", className: "bg-primary/10 text-primary" },
  };
  const c = config[status] || { label: status, className: "bg-muted text-muted-foreground" };
  return <Badge className={c.className + " border-0 text-xs px-4 py-1.5 font-medium"}>{c.label}</Badge>;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const Jobs = () => {
  const { jobs, isLoading, error } = useJobs();
  const { profile } = useProfile();
  const { apply, hasApplied, isApplying } = useApplications();
  const { hasAvailableSlots, remainingSlots, isConsuming } = useJobSlots();
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [reviewJob, setReviewJob] = useState<Job | null>(null);
  const deleteJob = useDeleteJob();
  const { toast } = useToast();

  const isEmployer = profile?.role === 'employer';
  const isAgency = profile?.role === 'agency';
  const isCandidate = profile?.role === 'candidate';
  const recruiterRestricted = (isEmployer || isAgency) && profile?.verification_status !== 'verified';

  const handleDelete = async (jobId: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteJob.mutateAsync(jobId);
      toast({ title: "Job deleted", description: `"${title}" has been removed.` });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message || "Please try again.", variant: "destructive" });
    }
  };

  const handleApply = async (jobId: string) => {
    setApplyingJobId(jobId);
    try {
      await apply(jobId);
      toast({ title: "Application submitted", description: "You have successfully applied for this job." });
    } catch (err: any) {
      toast({
        title: "Application failed",
        description: err?.message || "Could not submit application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setApplyingJobId(null);
    }
  };

  const handlePostJob = () => {
    if (recruiterRestricted) {
      toast({
        title: "Verification required",
        description: "Your account is under review",
        variant: "destructive",
      });
      return;
    }
    setShowCreateDialog(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 lg:space-y-14">
        <RecruiterVerificationBanner />

        {/* Page header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 sm:gap-6 lg:gap-10">
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground tracking-tight">Jobs</h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground font-light max-w-xl">
              {isEmployer ? "Your open positions and hiring pipeline" : "Browse available opportunities"}
            </p>
          </div>
          {(isEmployer || isAgency) && (
            <div className="relative group">
              <Button
                className="w-full sm:w-fit shadow-xl shadow-primary/25 h-11 sm:h-14 lg:h-16 px-6 sm:px-8 lg:px-10 text-sm sm:text-base font-semibold rounded-xl sm:rounded-2xl"
                onClick={handlePostJob}
                disabled={isConsuming || recruiterRestricted}
              >
                {isConsuming ? (
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                ) : (
                  <Plus className="w-5 h-5 mr-3" />
                )}
                Post New Job
                {hasAvailableSlots && remainingSlots > 0 && (
                  <Badge className="ml-3 bg-white/20 text-white border-0">
                    {remainingSlots} {remainingSlots === 1 ? 'slot' : 'slots'}
                  </Badge>
                )}
              </Button>
              {!hasAvailableSlots && !recruiterRestricted && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10">
                  <div className="bg-foreground text-background text-xs px-3 py-2 rounded-lg whitespace-nowrap">
                    Upgrade your plan to post more jobs
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-foreground" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upgrade banner for recruiters with no slots */}
        {(isEmployer || isAgency) && !hasAvailableSlots && !recruiterRestricted && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-sm">No job posting slots available</p>
                  <p className="text-xs text-muted-foreground">Upgrade your plan to post new positions and reach more candidates.</p>
                </div>
              </div>
              <Button size="sm" onClick={() => setShowUpgradeModal(true)}>
                Upgrade Plan
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-5">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground/60" />
            <Input
              placeholder="Search positions..."
              className="pl-11 sm:pl-14 h-11 sm:h-14 rounded-xl sm:rounded-2xl border-border/30 bg-card/50 text-sm sm:text-base focus:bg-card focus:border-border/60 transition-all"
            />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-full sm:w-44 h-11 sm:h-14 rounded-xl sm:rounded-2xl border-border/30 bg-card/50 text-sm sm:text-base">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-8 text-center">
              <p className="text-destructive">Failed to load jobs. Please try again.</p>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!isLoading && !error && jobs.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-16 text-center">
              <Briefcase className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No jobs available</h3>
              <p className="text-muted-foreground">
                {isEmployer ? "Post your first job to start receiving applications." : "Check back soon for new opportunities."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Jobs list */}
        {!isLoading && !error && jobs.length > 0 && (
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            {jobs.map((job) => (
              <Card key={job.id} className="card-float border-0 overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 sm:p-6 lg:p-10 xl:p-12">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 sm:gap-6 lg:gap-10">
                      {/* Job identity */}
                      <div className="flex items-start gap-4 sm:gap-5 lg:gap-7 flex-1">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-[72px] lg:h-[72px] rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center flex-shrink-0">
                          <Briefcase className="w-6 h-6 sm:w-7 sm:h-7 lg:w-9 lg:h-9 text-primary" />
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center gap-5 flex-wrap">
                            <h3 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground tracking-tight">{job.title}</h3>
                            {getStatusBadge(job.status)}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 lg:gap-8 text-sm text-muted-foreground font-light">
                            {job.organization_name && (
                              <span className="flex items-center gap-2.5">
                                <Building2 className="w-4 h-4 opacity-60" />Recruiter: {job.organization_name}
                              </span>
                            )}
                            <span className="flex items-center gap-2.5">
                              <Calendar className="w-4 h-4 opacity-60" />{formatDate(job.created_at)}
                            </span>
                          </div>
                          {job.description && (
                            <p className="text-muted-foreground/80 line-clamp-2 max-w-2xl">{job.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Actions - Employer dropdown */}
                      {isEmployer && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-xl w-12 h-12 hover:bg-muted/50">
                              <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl">
                            <Link to={`/dashboard/jobs/${job.id}/report`}>
                              <DropdownMenuItem className="py-3.5 px-4 rounded-lg font-medium">
                                <BarChart3 className="w-4 h-4 mr-2" />
                                View Report
                              </DropdownMenuItem>
                            </Link>
                            <Link to={`/dashboard/ai-matches?jobId=${job.id}`}>
                              <DropdownMenuItem className="py-3.5 px-4 rounded-lg font-medium">
                                <Briefcase className="w-4 h-4 mr-2" />
                                AI Matches
                              </DropdownMenuItem>
                            </Link>
                            <Link to={`/dashboard/jobs/${job.id}/pipeline`}>
                              <DropdownMenuItem className="py-3.5 px-4 rounded-lg font-medium">
                                <ClipboardList className="w-4 h-4 mr-2" />
                                Open Pipeline
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem className="py-3.5 px-4 rounded-lg font-medium" onClick={() => setReviewJob(job)}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Generate Client Link
                            </DropdownMenuItem>
                            <DropdownMenuItem className="py-3.5 px-4 rounded-lg font-medium" onClick={() => setEditJob(job)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit Position
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive py-3.5 px-4 rounded-lg font-medium" onClick={() => handleDelete(job.id, job.title)}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Position
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}

                      {isAgency && (
                        <div className="flex items-center gap-2">
                          <Button asChild variant="outline" className="h-10 sm:h-12 px-4 sm:px-6 rounded-lg sm:rounded-xl text-sm">
                            <Link to={`/dashboard/jobs/${job.id}/pipeline`}>
                              <ClipboardList className="w-4 h-4 mr-2" />
                              Open Pipeline
                            </Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-xl w-10 h-10 sm:w-12 sm:h-12 hover:bg-muted/50">
                                <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 p-2 rounded-xl">
                              <DropdownMenuItem className="py-3.5 px-4 rounded-lg font-medium" onClick={() => setReviewJob(job)}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Generate Client Link
                              </DropdownMenuItem>
                              <DropdownMenuItem className="py-3.5 px-4 rounded-lg font-medium" onClick={() => setEditJob(job)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Position
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive py-3.5 px-4 rounded-lg font-medium" onClick={() => handleDelete(job.id, job.title)}>
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete Position
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}

                      {/* Apply button - Candidates only */}
                      {isCandidate && job.status === 'open' && (
                        hasApplied(job.id) ? (
                          <Button variant="outline" className="h-10 sm:h-12 px-4 sm:px-6 rounded-lg sm:rounded-xl text-sm" disabled>
                            <CheckCircle className="w-4 h-4 mr-2 text-success" />
                            Applied
                          </Button>
                        ) : (
                          <Button
                            className="h-10 sm:h-12 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg shadow-primary/20 text-sm"
                            onClick={() => handleApply(job.id)}
                            disabled={applyingJobId === job.id}
                          >
                            {applyingJobId === job.id ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4 mr-2" />
                            )}
                            Apply Now
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateJobDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} />
      <CreateJobDialog
        open={!!editJob}
        onOpenChange={(open) => { if (!open) setEditJob(null); }}
        editJob={editJob ?? undefined}
      />
      {reviewJob && (
        <GenerateClientLinkModal
          open={!!reviewJob}
          onOpenChange={(open) => { if (!open) setReviewJob(null); }}
          job={reviewJob}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        variant="job_slots"
      />
    </DashboardLayout>
  );
};

export default Jobs;
