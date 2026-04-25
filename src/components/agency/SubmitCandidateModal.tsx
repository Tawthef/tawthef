import { useState } from "react";
import { ExternalLink, Loader2, Send, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";

interface SubmitCandidateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: { id: string; title: string; organization_name?: string };
}

interface PoolCandidate {
  candidate_id: string;
  full_name: string;
  skills: string[];
  years_experience: number;
}

export function SubmitCandidateModal({ open, onOpenChange, job }: SubmitCandidateModalProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch all unique candidates across all agency talent pools (two-step to avoid RLS join issues)
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["agency-pool-candidates", user?.id],
    queryFn: async (): Promise<PoolCandidate[]> => {
      if (!user?.id) return [];

      // Step 1: get all candidate IDs from this agency's pools
      const { data: members, error: membersError } = await supabase
        .from("talent_pool_candidates")
        .select("candidate_id")
        .order("created_at", { ascending: false });

      if (membersError) {
        console.error("[SubmitCandidateModal] Pool members error:", membersError);
        return [];
      }

      const candidateIds = Array.from(new Set((members || []).map((m: any) => m.candidate_id)));
      if (candidateIds.length === 0) return [];

      // Step 2: fetch profiles and candidate_profiles for those IDs
      const [profilesRes, cpRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", candidateIds),
        supabase.from("candidate_profiles").select("candidate_id, skills, years_experience").in("candidate_id", candidateIds),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p.full_name]));
      const cpMap = new Map((cpRes.data || []).map((cp: any) => [cp.candidate_id, cp]));

      return candidateIds.map((id) => ({
        candidate_id: id,
        full_name: profileMap.get(id) || "Unknown",
        skills: Array.isArray(cpMap.get(id)?.skills) ? cpMap.get(id).skills : [],
        years_experience: Number(cpMap.get(id)?.years_experience || 0),
      }));
    },
    enabled: open && !!user?.id,
    staleTime: 30 * 1000,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error("No candidate selected");

      const { error } = await supabase.from("applications").insert({
        job_id: job.id,
        candidate_id: selectedId,
        agency_id: profile?.organization_id ?? null,
      });

      if (error) {
        if (error.code === "23505") throw new Error("This candidate has already been submitted for this job");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-applications"] });
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      toast({ title: "Candidate submitted", description: `Successfully submitted for ${job.title}.` });
      setSelectedId(null);
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Submission failed", description: err?.message || "Please try again.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setSelectedId(null); onOpenChange(v); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Submit Candidate
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Submitting for: <span className="font-medium text-foreground">{job.title}</span>
            {job.organization_name && ` · ${job.organization_name}`}
          </p>
        </DialogHeader>

        <div className="max-h-72 overflow-y-auto space-y-2 py-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No candidates in your talent pools yet.</p>
              <p className="mt-1 text-xs">Add candidates via Resume Search or Talent Pools first.</p>
            </div>
          ) : (
            candidates.map((c) => (
              <button
                key={c.candidate_id}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedId === c.candidate_id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border/40 bg-card hover:border-border hover:bg-muted/30"
                }`}
                onClick={() => setSelectedId(c.candidate_id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                    {c.full_name[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground text-sm">{c.full_name}</p>
                    {c.years_experience > 0 && (
                      <p className="text-xs text-muted-foreground">{c.years_experience} yrs experience</p>
                    )}
                    {c.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {c.skills.slice(0, 3).map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>
                        ))}
                        {c.skills.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{c.skills.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <a
                    href={`/dashboard/candidates/${c.candidate_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-shrink-0 p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                    title="View full profile"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  {selectedId === c.candidate_id && (
                    <div className="w-4 h-4 rounded-full bg-primary flex-shrink-0" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setSelectedId(null); onOpenChange(false); }} disabled={submitMutation.isPending}>
            Cancel
          </Button>
          <Button onClick={() => submitMutation.mutate()} disabled={!selectedId || submitMutation.isPending}>
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Submit Candidate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
