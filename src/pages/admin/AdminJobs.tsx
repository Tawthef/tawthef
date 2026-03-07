import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertTriangle,
  Briefcase,
  Flag,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Shield,
  Trash2,
} from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import {
  ADMIN_JOBS_PAGE_SIZE,
  AdminJob,
  AdminJobFilterStatus,
  AdminJobStatus,
  useAdminJobs,
} from "@/hooks/useAdminJobs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_FILTER_OPTIONS: Array<{ label: string; value: AdminJobFilterStatus }> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Expired", value: "expired" },
  { label: "Flagged", value: "flagged" },
];

const EDIT_STATUS_OPTIONS: Array<{ label: string; value: AdminJobStatus }> = [
  { label: "Open", value: "open" },
  { label: "Expired", value: "expired" },
  { label: "Flagged", value: "flagged" },
  { label: "Closed", value: "closed" },
];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const getStatusClass = (status: AdminJobStatus) => {
  if (status === "open") return "bg-success/10 text-success border-success/20";
  if (status === "flagged") return "bg-warning/10 text-warning border-warning/20";
  if (status === "expired") return "bg-muted text-muted-foreground border-border";
  return "bg-muted text-muted-foreground border-border";
};

const getStatusLabel = (status: AdminJobStatus) => {
  if (status === "open") return "Open";
  if (status === "expired") return "Expired";
  if (status === "flagged") return "Flagged";
  if (status === "closed") return "Closed";
  return status;
};

const AdminJobs = () => {
  const { profile, isLoading: isProfileLoading } = useProfile();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AdminJobFilterStatus>("all");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<AdminJob | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    location: "",
    salary: "",
    skills: "",
    status: "open" as AdminJobStatus,
  });

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingJob, setDeletingJob] = useState<AdminJob | null>(null);

  const {
    jobs,
    pagination,
    isLoading,
    isFetching,
    error,
    updateJob,
    deleteJob,
    flagJob,
    isUpdating,
    isDeleting,
    isFlagging,
  } = useAdminJobs({
    page,
    limit: ADMIN_JOBS_PAGE_SIZE,
    search,
    status: statusFilter,
  });

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const totalLabel = useMemo(() => pagination.total.toLocaleString("en-US"), [pagination.total]);

  if (isProfileLoading) {
    return (
      <DashboardLayout>
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (profile?.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const openEditDialog = (job: AdminJob) => {
    setEditingJob(job);
    setEditForm({
      title: job.title,
      description: job.description || "",
      location: job.location || "",
      salary: job.salary || "",
      skills: job.skills.join(", "),
      status: job.status,
    });
    setIsEditOpen(true);
  };

  const handleUpdateJob = async () => {
    if (!editingJob) return;

    try {
      const skills = editForm.skills
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      await updateJob({
        jobId: editingJob.id,
        organizationId: editingJob.organization_id,
        updates: {
          title: editForm.title,
          description: editForm.description,
          location: editForm.location,
          salary: editForm.salary,
          skills,
          status: editForm.status,
        },
      });

      toast({
        title: "Job updated",
        description: `${editForm.title} was updated successfully.`,
      });
      setIsEditOpen(false);
      setEditingJob(null);
    } catch (updateError: any) {
      toast({
        title: "Failed to update job",
        description: updateError?.message || "Could not update this job.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteJob = async () => {
    if (!deletingJob) return;

    try {
      await deleteJob({
        jobId: deletingJob.id,
        organizationId: deletingJob.organization_id,
        title: deletingJob.title,
      });
      toast({
        title: "Job removed",
        description: `${deletingJob.title} was removed.`,
      });
      setIsDeleteConfirmOpen(false);
      setDeletingJob(null);
    } catch (deleteError: any) {
      toast({
        title: "Failed to remove job",
        description: deleteError?.message || "Could not remove this job.",
        variant: "destructive",
      });
    }
  };

  const handleFlagJob = async (job: AdminJob) => {
    try {
      await flagJob({
        jobId: job.id,
        organizationId: job.organization_id,
        title: job.title,
      });
      toast({
        title: "Job flagged",
        description: `${job.title} has been flagged for moderation.`,
      });
    } catch (flagError: any) {
      toast({
        title: "Failed to flag job",
        description: flagError?.message || "Could not flag this job.",
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Jobs Management
          </h1>
          <p className="text-muted-foreground">
            Moderate jobs, update listings, and remove inappropriate postings.
          </p>
        </section>

        <Card className="card-dashboard">
          <CardHeader className="pb-4">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Platform Jobs ({totalLabel})
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search job title or company..."
                    className="pl-9 h-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as AdminJobFilterStatus)}>
                  <SelectTrigger className="w-full sm:w-44 h-10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : error ? (
              <div className="py-14 text-center text-destructive text-sm">
                Failed to load jobs. Please try again.
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-14 text-center text-muted-foreground text-sm">
                No jobs found for the selected filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground">
                      <th className="text-left py-3 px-6 font-medium">Job Title</th>
                      <th className="text-left py-3 px-4 font-medium">Company</th>
                      <th className="text-left py-3 px-4 font-medium">Location</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Applications Count</th>
                      <th className="text-left py-3 px-4 font-medium">Created Date</th>
                      <th className="text-right py-3 px-6 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => (
                      <tr key={job.id} className="border-b border-border/10 hover:bg-muted/5 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-medium text-foreground">{job.title}</p>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">{job.company_name}</td>
                        <td className="py-4 px-4 text-muted-foreground">{job.location || "-"}</td>
                        <td className="py-4 px-4">
                          <Badge variant="outline" className={getStatusClass(job.status)}>
                            {getStatusLabel(job.status)}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">{job.applications_count}</td>
                        <td className="py-4 px-4 text-muted-foreground text-xs">{formatDate(job.created_at)}</td>
                        <td className="py-4 px-6 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openEditDialog(job)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit Job
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={job.status === "flagged" || isFlagging}
                                onClick={() => handleFlagJob(job)}
                              >
                                <Flag className="w-4 h-4 mr-2" />
                                Flag Job
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={isDeleting}
                                onClick={() => {
                                  setDeletingJob(job);
                                  setIsDeleteConfirmOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remove Job
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-border/20">
              <p className="text-xs text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
                {isFetching ? " - Updating..." : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1 || isFetching}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasNextPage || isFetching}
                  onClick={() => setPage((prev) => prev + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) {
            setEditingJob(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>Update job details and moderation status.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editForm.title}
                onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={5}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Location</label>
                <Input
                  value={editForm.location}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, location: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Salary</label>
                <Input
                  placeholder="e.g. 5000-7000"
                  value={editForm.salary}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, salary: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Skills</label>
                <Input
                  placeholder="Comma separated skills"
                  value={editForm.skills}
                  onChange={(event) => setEditForm((prev) => ({ ...prev, skills: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) => setEditForm((prev) => ({ ...prev, status: value as AdminJobStatus }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EDIT_STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateJob} disabled={isUpdating}>
              {isUpdating ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove Job
            </AlertDialogTitle>
            <AlertDialogDescription>
              Delete {deletingJob?.title || "this job"} from the platform? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteJob}>Delete Job</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default AdminJobs;
