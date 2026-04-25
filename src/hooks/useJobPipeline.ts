import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type PipelineStage = "applicants" | "shortlisted" | "interview" | "offer" | "hired";

type RecruiterRole = "employer" | "agency" | "admin";

export interface JobPipelineEntry {
  id: string;
  candidateId: string;
  status: string;
  appliedAt: string;
  candidateName: string;
  yearsExperience: number;
  skills: string[];
  aiMatchScore: number;
}

interface JobPipelineResponse {
  job: { id: string; title: string; status: string } | null;
  applications: JobPipelineEntry[];
}

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || "").trim()).filter(Boolean);
};

export const getPipelineStage = (status: string): PipelineStage => {
  switch (status) {
    case "agency_shortlisted":
    case "employer_review":
    case "hr_shortlisted":
    case "technical_shortlisted":
      return "shortlisted";
    case "interview":
      return "interview";
    case "offer":
      return "offer";
    case "hired":
      return "hired";
    case "rejected":
    case "applied":
    default:
      return "applicants";
  }
};

export const getStatusForStage = (stage: PipelineStage, role?: string | null) => {
  switch (stage) {
    case "shortlisted":
      return role === "agency" ? "agency_shortlisted" : "employer_review";
    case "interview":
      return "interview";
    case "offer":
      return "offer";
    case "hired":
      return "hired";
    case "applicants":
    default:
      return "applied";
  }
};

const getMaxScores = (rows: Array<{ candidate_id: string; score: number }>) => {
  const scoreByCandidateId = new Map<string, number>();
  for (const row of rows) {
    const current = scoreByCandidateId.get(row.candidate_id) || 0;
    if (row.score > current) scoreByCandidateId.set(row.candidate_id, row.score);
  }
  return scoreByCandidateId;
};

export function useJobPipeline(jobId?: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["job-pipeline", jobId],
    queryFn: async (): Promise<JobPipelineResponse> => {
      if (!jobId) return { job: null, applications: [] };

      const [jobRes, appRes] = await Promise.all([
        supabase.from("jobs").select("id, title, status").eq("id", jobId).maybeSingle(),
        supabase
          .from("applications")
          .select("id, candidate_id, status, applied_at")
          .eq("job_id", jobId)
          .order("applied_at", { ascending: false }),
      ]);

      if (jobRes.error) {
        throw jobRes.error;
      }
      if (appRes.error) {
        throw appRes.error;
      }

      const applications = (appRes.data || []) as Array<{
        id: string;
        candidate_id: string;
        status: string;
        applied_at: string;
      }>;

      if (applications.length === 0) {
        return {
          job: jobRes.data ? { id: jobRes.data.id, title: jobRes.data.title, status: jobRes.data.status } : null,
          applications: [],
        };
      }

      const candidateIds = Array.from(new Set(applications.map((item) => item.candidate_id)));
      const [profilesRes, candidateProfilesRes, scoresRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", candidateIds),
        supabase
          .from("candidate_profiles")
          .select("candidate_id, years_experience, skills")
          .in("candidate_id", candidateIds),
        supabase
          .from("candidate_job_scores")
          .select("candidate_id, score")
          .eq("job_id", jobId)
          .in("candidate_id", candidateIds),
      ]);

      if (candidateProfilesRes.error) {
        console.error("[useJobPipeline] Candidate profile error:", candidateProfilesRes.error);
      }
      if (scoresRes.error) {
        console.error("[useJobPipeline] Score error:", scoresRes.error);
      }

      const fullNameById = new Map(
        ((profilesRes.data || []) as Array<{ id: string; full_name: string | null }>)
          .map((p) => [p.id, p.full_name]),
      );

      const candidateProfileById = new Map(
        (
          (candidateProfilesRes.data || []) as Array<{
            candidate_id: string;
            years_experience: number | null;
            skills: string[] | null;
          }>
        ).map((item) => [item.candidate_id, item]),
      );

      const maxScoreByCandidateId = getMaxScores(
        ((scoresRes.data || []) as Array<{ candidate_id: string; score: number | null }>).map((row) => ({
          candidate_id: row.candidate_id,
          score: toNumber(row.score),
        })),
      );

      return {
        job: jobRes.data ? { id: jobRes.data.id, title: jobRes.data.title, status: jobRes.data.status } : null,
        applications: applications.map((application) => {
          const candidateProfile = candidateProfileById.get(application.candidate_id);
          return {
            id: application.id,
            candidateId: application.candidate_id,
            status: application.status,
            appliedAt: application.applied_at,
            candidateName: fullNameById.get(application.candidate_id) || "Candidate",
            yearsExperience: Number(candidateProfile?.years_experience || 0),
            skills: toStringArray(candidateProfile?.skills),
            aiMatchScore: maxScoreByCandidateId.get(application.candidate_id) || 0,
          };
        }),
      };
    },
    enabled: !!jobId,
    staleTime: 60 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      applicationId,
      stage,
      role,
    }: {
      applicationId: string;
      stage: PipelineStage;
      role?: string | null;
    }) => {
      const status = getStatusForStage(stage, role);
      const { error } = await supabase.from("applications").update({ status }).eq("id", applicationId);
      if (error) throw error;
      return status;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-pipeline", jobId] });
      queryClient.invalidateQueries({ queryKey: ["candidate-timeline"] });
      queryClient.invalidateQueries({ queryKey: ["employer-applications"] });
      queryClient.invalidateQueries({ queryKey: ["agency-applications"] });
      queryClient.invalidateQueries({ queryKey: ["job-report"] });
    },
  });

  return {
    job: query.data?.job || null,
    applications: query.data?.applications || [],
    isLoading: query.isLoading,
    error: query.error,
    moveApplication: updateMutation.mutateAsync,
    isMoving: updateMutation.isPending,
  };
}

export const isRecruiterRole = (role?: string | null): role is RecruiterRole =>
  !!role && ["employer", "agency", "admin"].includes(role);
