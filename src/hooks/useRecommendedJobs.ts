import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface RecommendedJob {
  job_id: string;
  title: string;
  organization_name: string;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0);
};

const normalizeScore = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

export function useRecommendedJobs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["candidate-recommended-jobs", user?.id],
    queryFn: async (): Promise<RecommendedJob[]> => {
      if (!user) return [];

      const { data, error } = await supabase.rpc("get_candidate_job_matches", {
        p_candidate_id: user.id,
      });

      if (error) {
        console.error("[useRecommendedJobs] Error:", error);
        return [];
      }

      return (data || []).map((row: any) => ({
        job_id: row.job_id,
        title: row.title || "Untitled Job",
        organization_name: row.organization_name || "Unknown Company",
        match_score: normalizeScore(row.match_score),
        matched_skills: toStringArray(row.matched_skills),
        missing_skills: toStringArray(row.missing_skills),
      }));
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}
