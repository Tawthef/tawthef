import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface PublicJobFilters {
  title: string;
  skills: string[];
  keywords: string[];
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  experienceLevel: string;
  jobType: string;
}

export interface PublicJob {
  id: string;
  title: string;
  description: string | null;
  organization_name: string;
  organization_type: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_range_text: string | null;
  experience_level: string | null;
  job_type: string | null;
  required_skills: string[];
  keywords: string[];
  created_at: string;
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0);
};

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeJob = (row: any): PublicJob => ({
  id: row.id,
  title: row.title || "Untitled Job",
  description: row.description || null,
  organization_name: row.organization_name || "Unknown Company",
  organization_type: row.organization_type || null,
  location: row.location || null,
  salary_min: toNumber(row.salary_min),
  salary_max: toNumber(row.salary_max),
  salary_range_text: row.salary_range_text || null,
  experience_level: row.experience_level || null,
  job_type: row.job_type || null,
  required_skills: toStringArray(row.required_skills),
  keywords: toStringArray(row.keywords),
  created_at: row.created_at,
});

export function usePublicJobs(filters: PublicJobFilters) {
  return useQuery({
    queryKey: ["public-jobs", filters],
    queryFn: async (): Promise<PublicJob[]> => {
      const { data, error } = await supabase.rpc("get_public_jobs", {
        p_title: filters.title || null,
        p_skills: filters.skills.length > 0 ? filters.skills : null,
        p_keywords: filters.keywords.length > 0 ? filters.keywords : null,
        p_location: filters.location || null,
        p_salary_min: filters.salaryMin,
        p_salary_max: filters.salaryMax,
        p_experience_level: filters.experienceLevel || null,
        p_job_type: filters.jobType || null,
        p_limit: 120,
        p_offset: 0,
      });

      if (error) {
        console.error("[usePublicJobs] Error:", error);
        return [];
      }

      return (data || []).map((row: any) => normalizeJob(row));
    },
    staleTime: 30 * 1000,
  });
}

export function usePublicJobById(jobId?: string) {
  return useQuery({
    queryKey: ["public-job-detail", jobId],
    queryFn: async (): Promise<PublicJob | null> => {
      if (!jobId) return null;

      const { data, error } = await supabase.rpc("get_public_job_by_id", {
        p_job_id: jobId,
      });

      if (error) {
        console.error("[usePublicJobById] Error:", error);
        return null;
      }

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return normalizeJob(row);
    },
    enabled: !!jobId,
    staleTime: 30 * 1000,
  });
}
