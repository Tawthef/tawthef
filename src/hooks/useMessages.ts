import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type MessageParticipantRole = "candidate" | "employer" | "agency" | "admin" | "expert" | null;

export interface MessageItem {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

export interface ConversationItem {
  participantId: string;
  participantName: string;
  participantRole: MessageParticipantRole;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface CandidateContact {
  id: string;
  fullName: string;
}

interface SendMessageInput {
  receiverId: string;
  message: string;
}

interface ProfileLookupItem {
  id: string;
  full_name: string | null;
  role: MessageParticipantRole;
}

const MESSAGE_SELECT = "id, sender_id, receiver_id, message, created_at, is_read";

const fallbackParticipantName = (role: MessageParticipantRole) => {
  if (role === "candidate") return "Candidate";
  if (role === "employer" || role === "agency" || role === "admin") return "Recruiter";
  return "User";
};

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["messages", "conversations", user?.id],
    queryFn: async (): Promise<ConversationItem[]> => {
      if (!user?.id) return [];

      const { data: rows, error } = await supabase
        .from("messages")
        .select(MESSAGE_SELECT)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("[useConversations] Error:", error);
        return [];
      }

      const messages = (rows || []) as MessageItem[];
      if (messages.length === 0) return [];

      const participantIds = Array.from(
        new Set(
          messages.map((item) => (item.sender_id === user.id ? item.receiver_id : item.sender_id))
        )
      );

      let profileMap = new Map<string, ProfileLookupItem>();
      if (participantIds.length > 0) {
        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("id", participantIds);

        if (profileError) {
          console.error("[useConversations] Profile lookup error:", profileError);
        } else {
          profileMap = new Map(
            ((profiles || []) as ProfileLookupItem[]).map((profile) => [profile.id, profile])
          );
        }
      }

      const conversations = new Map<string, ConversationItem>();
      for (const item of messages) {
        const participantId = item.sender_id === user.id ? item.receiver_id : item.sender_id;
        const participantProfile = profileMap.get(participantId);

        const existing = conversations.get(participantId);
        if (!existing) {
          conversations.set(participantId, {
            participantId,
            participantName: participantProfile?.full_name || fallbackParticipantName(participantProfile?.role || null),
            participantRole: participantProfile?.role || null,
            lastMessage: item.message,
            lastMessageAt: item.created_at,
            unreadCount: item.receiver_id === user.id && !item.is_read ? 1 : 0,
          });
          continue;
        }

        if (item.receiver_id === user.id && !item.is_read) {
          existing.unreadCount += 1;
        }
      }

      return Array.from(conversations.values()).sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );
    },
    enabled: !!user?.id,
    staleTime: 15 * 1000,
  });
}

export function useConversationMessages(participantId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["messages", "thread", user?.id, participantId],
    queryFn: async (): Promise<MessageItem[]> => {
      if (!user?.id || !participantId) return [];

      const { data, error } = await supabase
        .from("messages")
        .select(MESSAGE_SELECT)
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[useConversationMessages] Error:", error);
        return [];
      }

      return (data || []) as MessageItem[];
    },
    enabled: !!user?.id && !!participantId,
    staleTime: 5 * 1000,
  });
}

export function useRecruiterCandidateContacts(enabled: boolean) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["messages", "recruiter-contacts", user?.id],
    queryFn: async (): Promise<CandidateContact[]> => {
      if (!enabled || !user?.id) return [];

      const { data, error } = await supabase
        .from("applications")
        .select("candidate_id, profiles!applications_candidate_id_fkey(id, full_name)")
        .order("applied_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("[useRecruiterCandidateContacts] Error:", error);
        return [];
      }

      const contacts = new Map<string, CandidateContact>();
      for (const row of data || []) {
        const candidateId = (row as any)?.candidate_id as string | undefined;
        const profile = (row as any)?.profiles as { id?: string; full_name?: string | null } | null;
        if (!candidateId || contacts.has(candidateId)) continue;

        contacts.set(candidateId, {
          id: candidateId,
          fullName: profile?.full_name || "Candidate",
        });
      }

      return Array.from(contacts.values());
    },
    enabled: enabled && !!user?.id,
    staleTime: 60 * 1000,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ receiverId, message }: SendMessageInput) => {
      const { data, error } = await supabase.rpc("send_message", {
        p_receiver_id: receiverId,
        p_message: message,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkConversationRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (participantId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("receiver_id", user.id)
        .eq("sender_id", participantId)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
