import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreHorizontal, Building2, Calendar, Briefcase, Loader2, CheckCircle, Send } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useJobs } from "@/hooks/useJobs";
import { useProfile } from "@/hooks/useProfile";
import { useApplications } from "@/hooks/useApplications";
import { useState } from "react";

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
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  const isEmployer = profile?.role === 'employer';
  const isCandidate = profile?.role === 'candidate';

  const handleApply = async (jobId: string) => {
    setApplyingJobId(jobId);
    try {
      await apply(jobId);
    } catch (err) {
      console.error('[Apply] Error:', err);
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 sm:space-y-8 lg:space-y-14">
        {/* Page header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 sm:gap-6 lg:gap-10">
          <div className="space-y-3">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground tracking-tight">Jobs</h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground font-light max-w-xl">
              {isEmployer ? "Your open positions and hiring pipeline" : "Browse available opportunities"}
            </p>
          </div>
          {isEmployer && (
            <Button className="w-full sm:w-fit shadow-xl shadow-primary/25 h-11 sm:h-14 lg:h-16 px-6 sm:px-8 lg:px-10 text-sm sm:text-base font-semibold rounded-xl sm:rounded-2xl" disabled>
              <Plus className="w-5 h-5 mr-3" />Post New Job
            </Button>
          )}
        </div>

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
                                <Building2 className="w-4 h-4 opacity-60" />{job.organization_name}
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
                            <DropdownMenuItem className="py-3.5 px-4 rounded-lg font-medium">View Details</DropdownMenuItem>
                            <DropdownMenuItem className="py-3.5 px-4 rounded-lg font-medium">Edit Position</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive py-3.5 px-4 rounded-lg font-medium">Close Position</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
    </DashboardLayout>
  );
};

export default Jobs;

