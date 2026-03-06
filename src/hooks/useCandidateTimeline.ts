import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface CandidateTimelineEvent {
  event_key:
    | "applied"
    | "shortlisted"
    | "interview_scheduled"
    | "offer_sent"
    | "offer_accepted"
    | "hired";
  event_title: string;
  event_order: number;
  event_timestamp: string | null;
  is_completed: boolean;
}

const toBoolean = (value: unknown) => value === true || value === "true" || value === 1;

export function useCandidateTimeline(applicationId?: string | null) {
  return useQuery({
    queryKey: ["candidate-timeline", applicationId],
    queryFn: async (): Promise<CandidateTimelineEvent[]> => {
      if (!applicationId) return [];

      const { data, error } = await supabase.rpc("get_candidate_timeline", {
        p_application_id: applicationId,
      });

      if (error) {
        console.error("[useCandidateTimeline] Error:", error);
        return [];
      }

      return ((data || []) as any[]).map((row) => ({
        event_key: row.event_key,
        event_title: row.event_title,
        event_order: Number(row.event_order || 0),
        event_timestamp: row.event_timestamp || null,
        is_completed: toBoolean(row.is_completed),
      }));
    },
    enabled: !!applicationId,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}
