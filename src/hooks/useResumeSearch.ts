import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useProfile } from "./useProfile";

export interface ResumeSearchCandidate {
  candidate_id: string;
  full_name: string;
  location: string | null;
  skills: string[];
  years_experience: number;
  resume_url: string | null;
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
}

export interface ResumeSearchFilters {
  skills: string[];
  keywords: string[];
  minExperience: number;
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

const normalizeSkill = (value: string) => value.toLowerCase().trim();

export function useResumeSearch(filters: ResumeSearchFilters) {
  const { profile } = useProfile();

  return useQuery({
    queryKey: ["resume-search", profile?.id, filters],
    queryFn: async (): Promise<ResumeSearchCandidate[]> => {
      if (!profile || !["employer", "agency", "admin"].includes(profile.role)) return [];
      if (["employer", "agency"].includes(profile.role) && profile.verification_status !== "verified") return [];

      const { data, error } = await supabase.rpc("search_candidates", {
        p_skills: filters.skills,
        p_keywords: filters.keywords,
        p_min_experience: filters.minExperience,
      });

      if (error) {
        console.error("[useResumeSearch] Error:", error);
        return [];
      }

      const normalizedSearchSkills = filters.skills.map(normalizeSkill);

      return (data || []).map((row: any) => {
        const candidateSkills = toStringArray(row.skills);
        const candidateSkillSet = new Set(candidateSkills.map(normalizeSkill));
        const matchedSkills = filters.skills.filter((skill) => candidateSkillSet.has(normalizeSkill(skill)));
        const missingSkills = filters.skills.filter((skill) => !candidateSkillSet.has(normalizeSkill(skill)));

        return {
          candidate_id: row.candidate_id,
          full_name: row.full_name || "Unknown Candidate",
          location: row.location || null,
          skills: candidateSkills,
          years_experience: Number(row.years_experience || 0),
          resume_url: row.resume_url || null,
          match_score: normalizeScore(row.match_score),
          matched_skills: normalizedSearchSkills.length > 0 ? matchedSkills : [],
          missing_skills: normalizedSearchSkills.length > 0 ? missingSkills : [],
        } as ResumeSearchCandidate;
      });
    },
    enabled:
      !!profile &&
      ["employer", "agency", "admin"].includes(profile.role) &&
      (profile.role === "admin" || profile.verification_status === "verified"),
    staleTime: 60 * 1000,
  });
}
