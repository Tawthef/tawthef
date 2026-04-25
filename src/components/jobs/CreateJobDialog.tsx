import { useState, useEffect } from "react";
import { Loader2, Plus, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateJob, useUpdateJob } from "@/hooks/useJobs";
import { useJobSlots } from "@/hooks/useJobSlots";
import { useToast } from "@/hooks/use-toast";
import UpgradeModal from "@/components/UpgradeModal";

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, dialog operates in edit mode */
  editJob?: { id: string; title: string; description: string | null; status: string };
}

export function CreateJobDialog({ open, onOpenChange, editJob }: CreateJobDialogProps) {
  const isEdit = !!editJob;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"open" | "draft" | "closed">("open");
  const [showUpgrade, setShowUpgrade] = useState(false);

  const { hasAvailableSlots, consumeSlot, isConsuming } = useJobSlots();
  const createJob = useCreateJob();
  const updateJob = useUpdateJob();
  const { toast } = useToast();

  useEffect(() => {
    if (editJob) {
      setTitle(editJob.title);
      setDescription(editJob.description ?? "");
      setStatus((editJob.status as "open" | "draft" | "closed") ?? "open");
    } else {
      setTitle("");
      setDescription("");
      setStatus("open");
    }
  }, [editJob, open]);

  const isSubmitting = isConsuming || createJob.isPending || updateJob.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    if (isEdit) {
      try {
        await updateJob.mutateAsync({ id: editJob!.id, title: title.trim(), description, status });
        toast({ title: "Job updated", description: `"${title.trim()}" has been updated.` });
        onOpenChange(false);
      } catch (err: any) {
        toast({ title: "Update failed", description: err?.message || "Please try again.", variant: "destructive" });
      }
      return;
    }

    if (!hasAvailableSlots) {
      onOpenChange(false);
      setShowUpgrade(true);
      return;
    }

    try {
      await consumeSlot();
    } catch (err: any) {
      if (err?.message?.includes("NO_AVAILABLE_SLOTS")) {
        onOpenChange(false);
        setShowUpgrade(true);
      } else {
        toast({ title: "Error", description: "Failed to reserve job slot.", variant: "destructive" });
      }
      return;
    }

    try {
      await createJob.mutateAsync({ title: title.trim(), description, status: status as "open" | "draft" });
      toast({ title: "Job posted", description: `"${title.trim()}" is now ${status === "open" ? "live" : "saved as draft"}.` });
      setTitle("");
      setDescription("");
      setStatus("open");
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Failed to create job", description: err?.message || "Please try again.", variant: "destructive" });
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEdit ? <Pencil className="w-5 h-5 text-primary" /> : <Plus className="w-5 h-5 text-primary" />}
              {isEdit ? "Edit Job" : "Post New Job"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="job-title">Job Title <span className="text-destructive">*</span></Label>
              <Input
                id="job-title"
                placeholder="e.g. Senior Frontend Developer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-desc">Description</Label>
              <Textarea
                id="job-desc"
                placeholder="Describe the role, requirements, and responsibilities..."
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "open" | "draft" | "closed")} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open — visible to candidates</SelectItem>
                  <SelectItem value="draft">Draft — hidden until published</SelectItem>
                  {isEdit && <SelectItem value="closed">Closed — no longer accepting</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !title.trim()}>
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : isEdit ? (
                  <Pencil className="w-4 h-4 mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {isEdit ? "Save Changes" : "Post Job"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} variant="job_slots" />
    </>
  );
}
