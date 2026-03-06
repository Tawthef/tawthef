import DashboardLayout from "@/components/layout/DashboardLayout";
import CandidateTimeline from "@/components/CandidateTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useJobPipeline,
  getPipelineStage,
  JobPipelineEntry,
  PipelineStage,
} from "@/hooks/useJobPipeline";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CalendarPlus, MessageCircle, User, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";

const PIPELINE_COLUMNS: Array<{ key: PipelineStage; label: string }> = [
  { key: "applicants", label: "Applicants" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
];

const scoreClass = (score: number) => {
  if (score >= 80) return "bg-success/10 text-success border-success/30";
  if (score >= 60) return "bg-primary/10 text-primary border-primary/30";
  return "bg-muted text-muted-foreground border-border";
};

const JobPipeline = () => {
  const { id: jobId } = useParams<{ id: string }>();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { job, applications, isLoading, moveApplication, isMoving } = useJobPipeline(jobId);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<JobPipelineEntry | null>(null);

  const role = profile?.role;
  const isAllowed = role === "employer" || role === "agency";

  const groupedByStage = useMemo(() => {
    const grouped: Record<PipelineStage, typeof applications> = {
      applicants: [],
      shortlisted: [],
      interview: [],
      offer: [],
      hired: [],
    };
    for (const app of applications) {
      if (app.status === "rejected") continue;
      grouped[getPipelineStage(app.status)].push(app);
    }
    return grouped;
  }, [applications]);

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  const onDropToStage = async (stage: PipelineStage) => {
    if (!draggingId) return;
    const application = applications.find((item) => item.id === draggingId);
    if (!application) return;

    const currentStage = getPipelineStage(application.status);
    if (currentStage === stage) return;

    try {
      await moveApplication({ applicationId: application.id, stage, role });
      toast({
        title: "Pipeline updated",
        description: `${application.candidateName} moved to ${PIPELINE_COLUMNS.find((column) => column.key === stage)?.label}.`,
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error?.message || "Could not move candidate to this stage.",
        variant: "destructive",
      });
    } finally {
      setDraggingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-3">
          <Button asChild variant="ghost" size="sm" className="w-fit px-0">
            <Link to="/dashboard/jobs">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Jobs
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">Candidate Pipeline</h1>
            {job ? <Badge variant="outline">{job.title}</Badge> : null}
          </div>
          <p className="text-muted-foreground">
            Drag candidate cards between stages to update their application status.
          </p>
        </div>

        {isLoading ? (
          <div className="overflow-x-auto pb-2">
            <div className="grid grid-flow-col auto-cols-[minmax(280px,1fr)] gap-4 min-w-[1400px]">
              {PIPELINE_COLUMNS.map((column) => (
                <Card key={column.key} className="card-dashboard min-h-[520px]">
                  <CardHeader className="pb-3">
                    <Skeleton className="h-6 w-28" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="rounded-xl border border-border/20 p-3 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="grid grid-flow-col auto-cols-[minmax(280px,1fr)] gap-4 min-w-[1400px]">
              {PIPELINE_COLUMNS.map((column) => {
                const columnApplications = groupedByStage[column.key];
                return (
                  <Card
                    key={column.key}
                    className="card-dashboard min-h-[520px] flex flex-col"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      void onDropToStage(column.key);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base font-semibold">{column.label}</CardTitle>
                        <Badge variant="secondary">{columnApplications.length}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 flex-1 max-h-[72vh] overflow-y-auto">
                      {columnApplications.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border/40 p-5 text-center text-sm text-muted-foreground">
                          Drop candidates here
                        </div>
                      ) : (
                        columnApplications.map((application) => (
                          <div
                            key={application.id}
                            draggable={!isMoving}
                            onDragStart={() => setDraggingId(application.id)}
                            onDragEnd={() => setDraggingId(null)}
                            className={`rounded-xl border border-border/30 bg-card/80 p-3 space-y-3 ${
                              draggingId === application.id ? "opacity-60" : ""
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold truncate">{application.candidateName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {application.yearsExperience} years experience
                                </p>
                              </div>
                              <Badge className={`border ${scoreClass(application.aiMatchScore)}`}>
                                {application.aiMatchScore}%
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {application.skills.length > 0 ? (
                                application.skills.slice(0, 4).map((skill) => (
                                  <Badge key={`${application.id}-${skill}`} variant="outline" className="text-[11px]">
                                    {skill}
                                  </Badge>
                                ))
                              ) : (
                                <Badge variant="outline" className="text-[11px]">
                                  No skills listed
                                </Badge>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              <Button asChild variant="outline" size="sm" className="justify-start">
                                <Link
                                  to={`/dashboard/candidates/${application.candidateId}?applicationId=${application.id}`}
                                >
                                  <User className="w-3.5 h-3.5 mr-1.5" />
                                  View Profile
                                </Link>
                              </Button>
                              <Button asChild variant="outline" size="sm" className="justify-start">
                                <Link to={`/dashboard/messages?candidateId=${application.candidateId}`}>
                                  <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                                  Message
                                </Link>
                              </Button>
                              <Button asChild variant="outline" size="sm" className="justify-start">
                                <Link
                                  to={`/dashboard/interviews?jobId=${jobId}&candidateId=${application.candidateId}&applicationId=${application.id}`}
                                >
                                  <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
                                  Schedule Interview
                                </Link>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="justify-start"
                                onClick={() => setSelectedApplication(application)}
                              >
                                <Users className="w-3.5 h-3.5 mr-1.5" />
                                Open Timeline
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {!isLoading && applications.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center">
              <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">No applications yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Candidate cards will appear here once applications are submitted for this job.
              </p>
            </CardContent>
          </Card>
        )}

        <Dialog
          open={!!selectedApplication}
          onOpenChange={(open) => {
            if (!open) setSelectedApplication(null);
          }}
        >
          <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Candidate Hiring Timeline</DialogTitle>
            </DialogHeader>

            {selectedApplication ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-border/30 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{selectedApplication.candidateName}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedApplication.yearsExperience} years experience
                      </p>
                    </div>
                    <Badge className={`border ${scoreClass(selectedApplication.aiMatchScore)}`}>
                      {selectedApplication.aiMatchScore}% Match
                    </Badge>
                  </div>
                </div>

                <CandidateTimeline applicationId={selectedApplication.id} />

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to={`/dashboard/candidates/${selectedApplication.candidateId}?applicationId=${selectedApplication.id}`}
                    >
                      <User className="w-3.5 h-3.5 mr-1.5" />
                      View Profile
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/dashboard/messages?candidateId=${selectedApplication.candidateId}`}>
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                      Message
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to={`/dashboard/interviews?jobId=${jobId}&candidateId=${selectedApplication.candidateId}&applicationId=${selectedApplication.id}`}
                    >
                      <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
                      Schedule Interview
                    </Link>
                  </Button>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default JobPipeline;
