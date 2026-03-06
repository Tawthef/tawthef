import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export type ProfileStrengthSection =
  | "personal_info"
  | "skills"
  | "experience"
  | "education"
  | "cv_uploaded";

export interface ProfileStrengthResult {
  percentage: number;
  missingSections: ProfileStrengthSection[];
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const toSections = (value: unknown): ProfileStrengthSection[] => {
  if (!Array.isArray(value)) return [];
  const allowed: ProfileStrengthSection[] = [
    "personal_info",
    "skills",
    "experience",
    "education",
    "cv_uploaded",
  ];
  return value.filter(
    (item): item is ProfileStrengthSection =>
      typeof item === "string" && allowed.includes(item as ProfileStrengthSection)
  );
};

export function useProfileStrength(candidateId?: string | null) {
  const { user } = useAuth();
  const targetId = candidateId || user?.id;

  return useQuery({
    queryKey: ["profile-strength", targetId],
    queryFn: async (): Promise<ProfileStrengthResult> => {
      if (!targetId) return { percentage: 0, missingSections: [] };

      const { data, error } = await supabase.rpc("calculate_profile_strength", {
        p_candidate_id: targetId,
      });

      if (error) {
        console.error("[useProfileStrength] Error:", error);
        return { percentage: 0, missingSections: [] };
      }

      const row = Array.isArray(data) ? data[0] : data;
      return {
        percentage: toNumber(row?.percentage),
        missingSections: toSections(row?.missing_sections),
      };
    },
    enabled: !!targetId,
    staleTime: 60 * 1000,
  });
}
