import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type RecruiterRole = "employer" | "agency" | "admin";

const RECRUITER_ROLES: RecruiterRole[] = ["employer", "agency", "admin"];

export interface TalentPool {
  id: string;
  organization_id: string;
  name: string;
  created_at: string;
  candidateCount: number;
}

export interface TalentPoolCandidate {
  id: string;
  poolId: string;
  candidateId: string;
  fullName: string;
  yearsExperience: number;
  skills: string[];
  aiMatchScore: number;
  addedAt: string;
}

export interface RecruiterCandidateSummary {
  candidateId: string;
  fullName: string;
  yearsExperience: number;
  skills: string[];
  aiMatchScore: number;
  resumeUrl: string | null;
}

export interface CandidateProfileDetails extends RecruiterCandidateSummary {
  role: string | null;
}

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter((item) => item.length > 0);
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const isRecruiterRole = (role?: string | null): role is RecruiterRole =>
  !!role && RECRUITER_ROLES.includes(role as RecruiterRole);

const calculateMaxScores = (rows: Array<{ candidate_id: string; score: number }>) => {
  const result = new Map<string, number>();
  for (const row of rows) {
    const current = result.get(row.candidate_id) || 0;
    if (row.score > current) result.set(row.candidate_id, row.score);
  }
  return result;
};

export function useTalentPools() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["talent-pools", user?.id],
    queryFn: async (): Promise<TalentPool[]> => {
      if (!user?.id) return [];

      const { data: poolsData, error } = await supabase
        .from("talent_pools")
        .select("id, organization_id, name, created_at")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[useTalentPools] Error:", error);
        return [];
      }

      const pools = (poolsData || []) as Omit<TalentPool, "candidateCount">[];
      if (pools.length === 0) return [];

      const poolIds = pools.map((pool) => pool.id);
      const { data: poolCandidatesData, error: poolCandidatesError } = await supabase
        .from("talent_pool_candidates")
        .select("pool_id")
        .in("pool_id", poolIds);

      if (poolCandidatesError) {
        console.error("[useTalentPools] Candidate count error:", poolCandidatesError);
      }

      const counts = new Map<string, number>();
      for (const row of (poolCandidatesData || []) as Array<{ pool_id: string }>) {
        counts.set(row.pool_id, (counts.get(row.pool_id) || 0) + 1);
      }

      return pools.map((pool) => ({
        ...pool,
        candidateCount: counts.get(pool.id) || 0,
      }));
    },
    enabled: !!user?.id,
    staleTime: 20 * 1000,
  });
}

export function useTalentPoolCandidates(poolId: string | null, jobId?: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["talent-pool-candidates", user?.id, poolId, jobId ?? null],
    queryFn: async (): Promise<TalentPoolCandidate[]> => {
      if (!user?.id || !poolId) return [];

      const { data: rows, error } = await supabase
        .from("talent_pool_candidates")
        .select("id, pool_id, candidate_id, created_at")
        .eq("pool_id", poolId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[useTalentPoolCandidates] Error:", error);
        return [];
      }

      const poolCandidates = (rows || []) as Array<{
        id: string;
        pool_id: string;
        candidate_id: string;
        created_at: string;
      }>;
      if (poolCandidates.length === 0) return [];

      const candidateIds = Array.from(new Set(poolCandidates.map((item) => item.candidate_id)));

      let scoresQuery = supabase
        .from("candidate_job_scores")
        .select("candidate_id, score")
        .in("candidate_id", candidateIds);
      if (jobId) scoresQuery = scoresQuery.eq("job_id", jobId);

      const [profilesRes, candidateProfilesRes, scoresRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name").in("id", candidateIds),
        supabase.from("candidate_profiles").select("candidate_id, years_experience, skills").in("candidate_id", candidateIds),
        scoresQuery,
      ]);

      if (profilesRes.error) console.error("[useTalentPoolCandidates] Profile error:", profilesRes.error);
      if (candidateProfilesRes.error) console.error("[useTalentPoolCandidates] Candidate profile error:", candidateProfilesRes.error);
      if (scoresRes.error) console.error("[useTalentPoolCandidates] Score error:", scoresRes.error);

      const profilesById = new Map(
        ((profilesRes.data || []) as Array<{ id: string; full_name: string | null }>).map((profile) => [
          profile.id,
          profile,
        ])
      );
      const candidateProfilesById = new Map(
        ((candidateProfilesRes.data || []) as Array<{ candidate_id: string; years_experience: number | null; skills: string[] | null }>).map(
          (profile) => [profile.candidate_id, profile]
        )
      );

      const maxScoreByCandidateId = calculateMaxScores(
        ((scoresRes.data || []) as Array<{ candidate_id: string; score: number | null }>).map((row) => ({
          candidate_id: row.candidate_id,
          score: toNumber(row.score),
        }))
      );

      return poolCandidates.map((row) => {
        const profile = profilesById.get(row.candidate_id);
        const candidateProfile = candidateProfilesById.get(row.candidate_id);
        return {
          id: row.id,
          poolId: row.pool_id,
          candidateId: row.candidate_id,
          fullName: profile?.full_name || "Candidate",
          yearsExperience: Number(candidateProfile?.years_experience || 0),
          skills: toStringArray(candidateProfile?.skills),
          aiMatchScore: maxScoreByCandidateId.get(row.candidate_id) || 0,
          addedAt: row.created_at,
        };
      });
    },
    enabled: !!user?.id && !!poolId,
    staleTime: 15 * 1000,
  });
}

export function useRecruiterCandidateDirectory(role?: string | null) {
  const { user } = useAuth();
  const enabled = isRecruiterRole(role);

  return useQuery({
    queryKey: ["talent-pools", "candidate-directory", user?.id, role],
    queryFn: async (): Promise<RecruiterCandidateSummary[]> => {
      if (!enabled || !user?.id) return [];

      const { data: applications, error } = await supabase
        .from("applications")
        .select("candidate_id")
        .order("applied_at", { ascending: false })
        .limit(1000);

      if (error) {
        console.error("[useRecruiterCandidateDirectory] Applications error:", error);
        return [];
      }

      const candidateIds = Array.from(
        new Set(
          ((applications || []) as Array<{ candidate_id: string | null }>)
            .map((item) => item.candidate_id)
            .filter((value): value is string => typeof value === "string" && value.length > 0)
        )
      );

      if (candidateIds.length === 0) return [];

      const [profilesRes, candidateProfilesRes, scoresRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", candidateIds),
        supabase
          .from("candidate_profiles")
          .select("candidate_id, years_experience, skills, resume_url")
          .in("candidate_id", candidateIds),
        supabase
          .from("candidate_job_scores")
          .select("candidate_id, score")
          .in("candidate_id", candidateIds),
      ]);

      if (profilesRes.error) console.error("[useRecruiterCandidateDirectory] Profiles error:", profilesRes.error);
      if (candidateProfilesRes.error) console.error("[useRecruiterCandidateDirectory] Candidate profiles error:", candidateProfilesRes.error);
      if (scoresRes.error) console.error("[useRecruiterCandidateDirectory] Scores error:", scoresRes.error);

      const profilesById = new Map(
        ((profilesRes.data || []) as Array<{ id: string; full_name: string | null }>).map((profile) => [profile.id, profile])
      );
      const candidateProfilesById = new Map(
        ((candidateProfilesRes.data || []) as Array<{ candidate_id: string; years_experience: number | null; skills: string[] | null; resume_url: string | null }>).map(
          (profile) => [profile.candidate_id, profile]
        )
      );
      const maxScoreByCandidateId = calculateMaxScores(
        ((scoresRes.data || []) as Array<{ candidate_id: string; score: number | null }>).map((row) => ({
          candidate_id: row.candidate_id,
          score: toNumber(row.score),
        }))
      );

      return candidateIds
        .map((candidateId) => {
          const profile = profilesById.get(candidateId);
          const candidateProfile = candidateProfilesById.get(candidateId);
          return {
            candidateId,
            fullName: profile?.full_name || "Candidate",
            yearsExperience: Number(candidateProfile?.years_experience || 0),
            skills: toStringArray(candidateProfile?.skills),
            aiMatchScore: maxScoreByCandidateId.get(candidateId) || 0,
            resumeUrl: candidateProfile?.resume_url || null,
          } as RecruiterCandidateSummary;
        })
        .sort((a, b) => b.aiMatchScore - a.aiMatchScore);
    },
    enabled: enabled && !!user?.id,
    staleTime: 60 * 1000,
  });
}

export function useCandidateProfileDetailsForRecruiter(candidateId: string | null, role?: string | null) {
  const { user } = useAuth();
  const enabled = isRecruiterRole(role) && !!candidateId;

  return useQuery({
    queryKey: ["candidate-profile-details", user?.id, candidateId, role],
    queryFn: async (): Promise<CandidateProfileDetails | null> => {
      if (!enabled || !candidateId || !user?.id) return null;

      const [profileRes, candidateProfileRes, scoreRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, role")
          .eq("id", candidateId)
          .maybeSingle(),
        supabase
          .from("candidate_profiles")
          .select("candidate_id, years_experience, skills, resume_url")
          .eq("candidate_id", candidateId)
          .maybeSingle(),
        supabase
          .from("candidate_job_scores")
          .select("score")
          .eq("candidate_id", candidateId),
      ]);

      if (profileRes.error) {
        console.error("[useCandidateProfileDetailsForRecruiter] Profile error:", profileRes.error);
        return null;
      }
      if (candidateProfileRes.error) {
        console.error("[useCandidateProfileDetailsForRecruiter] Candidate profile error:", candidateProfileRes.error);
      }
      if (scoreRes.error) {
        console.error("[useCandidateProfileDetailsForRecruiter] Score error:", scoreRes.error);
      }

      const maxScore = Math.max(
        0,
        ...((scoreRes.data || []) as Array<{ score: number | null }>).map((row) => toNumber(row.score))
      );

      return {
        candidateId,
        fullName: profileRes.data?.full_name || "Candidate",
        yearsExperience: Number(candidateProfileRes.data?.years_experience || 0),
        skills: toStringArray(candidateProfileRes.data?.skills),
        aiMatchScore: maxScore,
        resumeUrl: candidateProfileRes.data?.resume_url || null,
        role: profileRes.data?.role || null,
      };
    },
    enabled: enabled && !!user?.id,
    staleTime: 30 * 1000,
  });
}

export function useTalentPoolActions() {
  const queryClient = useQueryClient();

  const invalidatePools = () => {
    queryClient.invalidateQueries({ queryKey: ["talent-pools"] });
    queryClient.invalidateQueries({ queryKey: ["talent-pool-candidates"] });
    queryClient.invalidateQueries({ queryKey: ["candidate-profile-details"] });
  };

  const createPoolMutation = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.rpc("create_talent_pool", { p_name: name });
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidatePools,
  });

  const renamePoolMutation = useMutation({
    mutationFn: async ({ poolId, name }: { poolId: string; name: string }) => {
      const { error } = await supabase.rpc("rename_talent_pool", { p_pool_id: poolId, p_name: name });
      if (error) throw error;
    },
    onSuccess: invalidatePools,
  });

  const deletePoolMutation = useMutation({
    mutationFn: async (poolId: string) => {
      const { error } = await supabase.rpc("delete_talent_pool", { p_pool_id: poolId });
      if (error) throw error;
    },
    onSuccess: invalidatePools,
  });

  const addCandidateMutation = useMutation({
    mutationFn: async ({ poolId, candidateId }: { poolId: string; candidateId: string }) => {
      const { data, error } = await supabase.rpc("add_candidate_to_talent_pool", {
        p_pool_id: poolId,
        p_candidate_id: candidateId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: invalidatePools,
  });

  const removeCandidateMutation = useMutation({
    mutationFn: async ({ poolId, candidateId }: { poolId: string; candidateId: string }) => {
      const { error } = await supabase.rpc("remove_candidate_from_talent_pool", {
        p_pool_id: poolId,
        p_candidate_id: candidateId,
      });
      if (error) throw error;
    },
    onSuccess: invalidatePools,
  });

  return {
    createPool: createPoolMutation.mutateAsync,
    isCreatingPool: createPoolMutation.isPending,
    renamePool: renamePoolMutation.mutateAsync,
    isRenamingPool: renamePoolMutation.isPending,
    deletePool: deletePoolMutation.mutateAsync,
    isDeletingPool: deletePoolMutation.isPending,
    addCandidateToPool: addCandidateMutation.mutateAsync,
    isAddingCandidate: addCandidateMutation.isPending,
    removeCandidateFromPool: removeCandidateMutation.mutateAsync,
    isRemovingCandidate: removeCandidateMutation.isPending,
  };
}
