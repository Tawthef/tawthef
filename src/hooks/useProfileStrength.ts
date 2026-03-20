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

interface ProfileStrengthProfileRow {
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  role?: string | null;
}

interface ProfileStrengthCandidateRow {
  skills?: string[] | null;
  years_experience?: number | null;
  education?: string[] | null;
  resume_url?: string | null;
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

const calculateLocalProfileStrength = (
  profile: ProfileStrengthProfileRow | null,
  candidateProfile: ProfileStrengthCandidateRow | null,
): ProfileStrengthResult => {
  let percentage = 0;
  const missingSections: ProfileStrengthSection[] = [];

  const hasPersonalInfo = Boolean(
    profile?.full_name?.trim() || profile?.email?.trim() || profile?.avatar_url?.trim(),
  );
  const hasSkills = (candidateProfile?.skills?.length || 0) > 0;
  const hasExperience = Number(candidateProfile?.years_experience || 0) > 0;
  const hasEducation = (candidateProfile?.education?.length || 0) > 0;
  const hasResume = Boolean(candidateProfile?.resume_url?.trim());

  if (hasPersonalInfo) percentage += 20;
  else missingSections.push("personal_info");

  if (hasSkills) percentage += 20;
  else missingSections.push("skills");

  if (hasExperience) percentage += 20;
  else missingSections.push("experience");

  if (hasEducation) percentage += 20;
  else missingSections.push("education");

  if (hasResume) percentage += 20;
  else missingSections.push("cv_uploaded");

  return { percentage, missingSections };
};

export function useProfileStrength(candidateId?: string | null) {
  const { user } = useAuth();
  const targetId = candidateId || user?.id;

  return useQuery({
    queryKey: ["profile-strength", targetId],
    queryFn: async (): Promise<ProfileStrengthResult> => {
      if (!targetId) return { percentage: 0, missingSections: [] };

      const [rpcResponse, profileResponse, candidateProfileResponse] = await Promise.all([
        supabase.rpc("calculate_profile_strength", {
          p_candidate_id: targetId,
        }),
        supabase
          .from("profiles")
          .select("full_name, email, avatar_url, role")
          .eq("id", targetId)
          .maybeSingle(),
        supabase
          .from("candidate_profiles")
          .select("skills, years_experience, education, resume_url")
          .eq("candidate_id", targetId)
          .maybeSingle(),
      ]);

      if (profileResponse.error) {
        console.error("[useProfileStrength] Profile lookup error:", profileResponse.error);
      }
      if (candidateProfileResponse.error) {
        console.error("[useProfileStrength] Candidate profile lookup error:", candidateProfileResponse.error);
      }

      const localResult = calculateLocalProfileStrength(
        (profileResponse.data || null) as ProfileStrengthProfileRow | null,
        (candidateProfileResponse.data || null) as ProfileStrengthCandidateRow | null,
      );

      if (rpcResponse.error) {
        console.error("[useProfileStrength] Error:", rpcResponse.error);
        return localResult;
      }

      const row = Array.isArray(rpcResponse.data) ? rpcResponse.data[0] : rpcResponse.data;
      const rpcResult = {
        percentage: toNumber(row?.percentage),
        missingSections: toSections(row?.missing_sections),
      };

      return localResult.percentage > rpcResult.percentage ? localResult : rpcResult;
    },
    enabled: !!targetId,
    staleTime: 60 * 1000,
  });
}
