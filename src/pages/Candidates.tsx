import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Briefcase, Loader2, CheckCircle, XCircle, Clock, User } from "lucide-react";
import { useEmployerApplications } from "@/hooks/useEmployerApplications";
import { useProfile } from "@/hooks/useProfile";
import { useUpdateApplicationStatus, getAllowedTransitions } from "@/hooks/useUpdateApplicationStatus";
import StatusProgressBar from "@/components/StatusProgressBar";
import { useState } from "react";

const statusConfig: Record<string, { label: string; className: string }> = {
  "applied": { label: "New", className: "bg-primary/10 text-primary" },
  "agency_shortlisted": { label: "Agency Shortlisted", className: "bg-blue-500/10 text-blue-600" },
  "hr_shortlisted": { label: "HR Shortlisted", className: "bg-accent/10 text-accent" },
  "technical_shortlisted": { label: "Technical Shortlisted", className: "bg-indigo-500/10 text-indigo-600" },
  "interview": { label: "Interview", className: "bg-warning/10 text-warning" },
  "offer": { label: "Offer Sent", className: "bg-success/10 text-success" },
  "hired": { label: "Hired", className: "bg-success/20 text-success" },
  "rejected": { label: "Rejected", className: "bg-destructive/10 text-destructive" },
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const Candidates = () => {
  const { applications, isLoading } = useEmployerApplications();
  const { profile } = useProfile();
  const { updateStatus, isUpdating } = useUpdateApplicationStatus();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const role = profile?.role || '';

  const handleAction = async (applicationId: string, newStatus: string) => {
    setUpdatingId(applicationId);
    try {
      await updateStatus({ applicationId, newStatus });
    } catch (err) {
      // Toast handled by hook
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-14">
        {/* Page header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-10">
          <div className="space-y-3">
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground tracking-tight">Applications</h1>
            <p className="text-xl text-muted-foreground font-light max-w-xl">
              Review and manage candidate applications through the hiring pipeline
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
            <Input
              placeholder="Search applications..."
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
              <Briefcase className="w-16 h-16 text-muted-foreground/30 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No applications yet</h3>
              <p className="text-muted-foreground">
                Applications will appear here when candidates apply to your jobs.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Applications list */}
        {!isLoading && applications.length > 0 && (
          <div className="space-y-6">
            {applications.map((app) => {
              const transitions = getAllowedTransitions(app.status, role);
              const isThisUpdating = updatingId === app.id;

              return (
                <Card key={app.id} className="card-float border-0 overflow-hidden">
                  <CardContent className="p-8 lg:p-10">
                    <div className="space-y-6">
                      <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                        {/* Candidate info */}
                        <div className="flex items-center gap-6 flex-1">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/12 to-primary/4 flex items-center justify-center flex-shrink-0">
                            <User className="w-7 h-7 text-primary" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-4 flex-wrap">
                              <h3 className="text-xl font-semibold text-foreground">{app.candidate_name}</h3>
                              <Badge className={statusConfig[app.status]?.className + " border-0 text-xs px-3 py-1 font-medium"}>
                                {statusConfig[app.status]?.label || app.status}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground">{app.job_title}</p>
                            <p className="text-sm text-muted-foreground/60 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Applied {formatDate(app.applied_at)}
                            </p>
                          </div>
                        </div>

                        {/* Context-aware action buttons */}
                        {transitions.length > 0 && (
                          <div className="flex items-center gap-3 flex-wrap">
                            {transitions.map((t) => (
                              <Button
                                key={t.status}
                                variant={t.variant === 'destructive' ? 'outline' : 'default'}
                                className={
                                  t.variant === 'destructive'
                                    ? "h-11 px-5 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                                    : "h-11 px-5 rounded-xl shadow-lg shadow-primary/20"
                                }
                                onClick={() => handleAction(app.id, t.status)}
                                disabled={isThisUpdating}
                              >
                                {isThisUpdating ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    {t.variant === 'destructive' ? (
                                      <XCircle className="w-4 h-4 mr-2" />
                                    ) : (
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                    )}
                                    {t.label}
                                  </>
                                )}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Status Progress Bar */}
                      <StatusProgressBar currentStatus={app.status} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Candidates;
