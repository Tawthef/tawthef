import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CandidateShare {
  id: string;
  token: string;
  candidate_id: string;
  organization_id: string;
  shared_by: string;
  job_id: string | null;
  expires_at: string;
  is_active: boolean;
  view_count: number;
  created_at: string;
}

export interface CandidateShareProfile {
  full_name: string;
  avatar_url: string | null;
  summary: string | null;
  skills: string[] | null;
  experience: any[] | null;
  education: any[] | null;
  projects: any[] | null;
  certifications: any[] | null;
  years_experience: number | null;
  location: string | null;
  job_title: string | null;
  languages: string[] | null;
  expires_at: string;
  shared_by_name: string;
  organization_name: string;
}

export function useCreateCandidateShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      candidateId,
      jobId,
      expiresDays = 30,
    }: {
      candidateId: string;
      jobId?: string;
      expiresDays?: number;
    }) => {
      const { data, error } = await supabase.rpc("create_candidate_share", {
        p_candidate_id: candidateId,
        p_job_id: jobId ?? null,
        p_expires_days: expiresDays,
      });
      if (error) throw error;
      return data as string; // token
    },
    onSuccess: (_, { candidateId }) => {
      queryClient.invalidateQueries({ queryKey: ["candidate-shares", candidateId] });
    },
  });
}

export function useRevokeCandidateShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shareId,
      candidateId,
    }: {
      shareId: string;
      candidateId: string;
    }) => {
      const { error } = await supabase.rpc("revoke_candidate_share", {
        p_share_id: shareId,
      });
      if (error) throw error;
    },
    onSuccess: (_, { candidateId }) => {
      queryClient.invalidateQueries({ queryKey: ["candidate-shares", candidateId] });
    },
  });
}

export function useCandidateShares(candidateId: string | undefined) {
  return useQuery({
    queryKey: ["candidate-shares", candidateId],
    enabled: !!candidateId,
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("candidate_shares")
        .select("*")
        .eq("candidate_id", candidateId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CandidateShare[];
    },
  });
}

export function useCandidateShareProfile(token: string | undefined) {
  return useQuery({
    queryKey: ["candidate-share-profile", token],
    enabled: !!token,
    staleTime: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_candidate_share_profile", {
        p_token: token!,
      });
      if (error) throw error;
      return data as CandidateShareProfile | null;
    },
  });
}

export function getShareUrl(token: string): string {
  return `${window.location.origin}/share/candidate/${token}`;
}
