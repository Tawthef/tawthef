import { useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Loader2, Sparkles } from "lucide-react";
import { useRecommendedJobs } from "@/hooks/useRecommendedJobs";
import { useApplications } from "@/hooks/useApplications";

const matchClass = (score: number) => {
  if (score > 80) return "bg-success/10 text-success border-success/30";
  if (score >= 60) return "bg-primary/10 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
};

const skillsListClass = (tone: "matched" | "missing") =>
  tone === "matched"
    ? "bg-success/10 text-success border-success/30"
    : "bg-muted/50 text-muted-foreground border-border";

const RecommendedJobs = () => {
  const { data: jobs, isLoading } = useRecommendedJobs();
  const { apply, hasApplied } = useApplications();
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  const handleApply = async (jobId: string) => {
    setApplyingJobId(jobId);
    try {
      await apply(jobId);
    } catch (error) {
      // Toast is already handled by useApplications callers in this codebase.
      console.error("[RecommendedJobs] apply error:", error);
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <Card className="card-dashboard">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Recommended Jobs For You
        </CardTitle>
        <Link to="/dashboard/jobs">
          <Button variant="ghost" size="sm" className="text-primary text-xs">
            View all
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-border/20 p-4 bg-muted/10">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-7 w-20 rounded-full" />
              </div>
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          ))
        ) : jobs && jobs.length > 0 ? (
          jobs.map((job) => {
            const applied = hasApplied(job.job_id);
            const isApplying = applyingJobId === job.job_id;

            return (
              <div
                key={job.job_id}
                className="rounded-xl border border-border/30 bg-muted/10 hover:bg-muted/20 transition-colors p-4 sm:p-5"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <p className="text-base font-semibold text-foreground truncate">{job.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{job.organization_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge className={`border text-xs ${matchClass(job.match_score)}`}>
                      {job.match_score}% Match
                    </Badge>
                    {applied ? (
                      <Button size="sm" variant="outline" disabled>
                        Applied
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => handleApply(job.job_id)} disabled={isApplying}>
                        {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Skills Matched
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {job.matched_skills.length > 0 ? (
                        job.matched_skills.slice(0, 6).map((skill) => (
                          <Badge key={`${job.job_id}-m-${skill}`} className={`border ${skillsListClass("matched")}`}>
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <Badge className="border bg-muted/40 text-muted-foreground border-border">No matches yet</Badge>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Skills Missing
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {job.missing_skills.length > 0 ? (
                        job.missing_skills.slice(0, 6).map((skill) => (
                          <Badge key={`${job.job_id}-x-${skill}`} className={`border ${skillsListClass("missing")}`}>
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <Badge className="border bg-success/10 text-success border-success/30">No missing skills</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No recommendations available yet</p>
            <p className="text-xs mt-1">Complete your profile skills to unlock better matches.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendedJobs;
