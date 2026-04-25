import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

export interface ClientReviewLink {
  id: string;
  token: string;
  job_id: string;
  expires_at: string;
  is_active: boolean;
  view_count: number;
  created_at: string;
}

export interface ClientReviewCandidate {
  sr_no: number;
  full_name: string;
  position_name: string;
  location: string | null;
  years_experience: number | null;
  education: string[] | null;
  skills: string[] | null;
  certifications: any[] | null;
  agency_name: string | null;
  submitted_at: string;
}

export interface ClientReviewSheet {
  job_title: string;
  organization_name: string;
  expires_at: string;
  shared_by_name: string;
  candidates: ClientReviewCandidate[];
}

export function getClientReviewUrl(token: string): string {
  return `${window.location.origin}/review/job/${token}`;
}

export function useCreateClientReviewLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, expiresDays }: { jobId: string; expiresDays: number }) => {
      const { data, error } = await supabase.rpc("create_client_review_link", {
        p_job_id: jobId,
        p_expires_days: expiresDays,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-review-links", variables.jobId] });
    },
  });
}

export function useClientReviewLinks(jobId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["client-review-links", jobId],
    queryFn: async (): Promise<ClientReviewLink[]> => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("client_review_links")
        .select("*")
        .eq("job_id", jobId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ClientReviewLink[];
    },
    enabled: !!jobId && !!user,
    staleTime: 30 * 1000,
  });
}

export function useRevokeClientReviewLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ linkId, jobId }: { linkId: string; jobId: string }) => {
      const { error } = await supabase.rpc("revoke_client_review_link", { p_link_id: linkId });
      if (error) throw error;
      return jobId;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-review-links", variables.jobId] });
    },
  });
}

export function useClientReviewSheet(token: string | undefined) {
  return useQuery({
    queryKey: ["client-review-sheet", token],
    queryFn: async (): Promise<ClientReviewSheet | null> => {
      if (!token) return null;
      const { data, error } = await supabase.rpc("get_client_review_sheet", { p_token: token });
      if (error) throw error;
      return data as ClientReviewSheet | null;
    },
    enabled: !!token,
    staleTime: 60 * 1000,
    retry: false,
  });
}
