import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type NotificationType = "system" | "applications" | "interviews" | "offers" | "messages" | string;
export type NotificationFilter = "all" | "unread" | "system" | "applications" | "interviews" | "offers" | "messages";

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

interface UseNotificationsHistoryOptions {
  filter: NotificationFilter;
  page: number;
  pageSize?: number;
}

interface NotificationsHistoryResult {
  notifications: NotificationItem[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

const NOTIFICATION_SELECT = "id, user_id, title, message, type, is_read, created_at";

const applyFilter = (query: any, filter: NotificationFilter) => {
  if (filter === "unread") return query.eq("is_read", false);
  if (filter !== "all") return query.eq("type", filter);
  return query;
};

export function useUnreadNotificationCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", "unread-count", user?.id],
    queryFn: async (): Promise<number> => {
      if (!user?.id) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("[useUnreadNotificationCount] Error:", error);
        return 0;
      }

      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });
}

export function useRecentNotifications(limit = 5) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", "recent", user?.id, limit],
    queryFn: async (): Promise<NotificationItem[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select(NOTIFICATION_SELECT)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("[useRecentNotifications] Error:", error);
        return [];
      }

      return (data || []) as NotificationItem[];
    },
    enabled: !!user?.id,
    staleTime: 15 * 1000,
  });
}

export function useNotificationsHistory({ filter, page, pageSize = 12 }: UseNotificationsHistoryOptions) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notifications", "history", user?.id, filter, page, pageSize],
    queryFn: async (): Promise<NotificationsHistoryResult> => {
      if (!user?.id) {
        return { notifications: [], total: 0, totalPages: 1, page: 1, pageSize };
      }

      const safePage = Math.max(1, page);
      const from = (safePage - 1) * pageSize;
      const to = from + pageSize - 1;

      let queryBuilder = supabase
        .from("notifications")
        .select(NOTIFICATION_SELECT, { count: "exact" })
        .eq("user_id", user.id);

      queryBuilder = applyFilter(queryBuilder, filter);

      const { data, error, count } = await queryBuilder
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) {
        console.error("[useNotificationsHistory] Error:", error);
        return { notifications: [], total: 0, totalPages: 1, page: safePage, pageSize };
      }

      const total = count || 0;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));

      return {
        notifications: (data || []) as NotificationItem[],
        total,
        totalPages,
        page: safePage,
        pageSize,
      };
    },
    enabled: !!user?.id,
    staleTime: 15 * 1000,
  });
}

export function useNotificationActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidateNotifications = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: invalidateNotifications,
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: invalidateNotifications,
  });

  return {
    markAsRead: markAsReadMutation.mutateAsync,
    isMarkingAsRead: markAsReadMutation.isPending,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
  };
}

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  system: "System",
  applications: "Applications",
  interviews: "Interviews",
  offers: "Offers",
  messages: "Messages",
};

export const getNotificationTypeLabel = (type: string) => {
  return NOTIFICATION_TYPE_LABELS[type] || "System";
};

export const getNotificationTypeClass = (type: string) => {
  if (type === "applications") return "bg-primary/10 text-primary border-primary/20";
  if (type === "interviews") return "bg-accent/10 text-accent border-accent/20";
  if (type === "offers") return "bg-success/10 text-success border-success/20";
  if (type === "messages") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  return "bg-muted text-muted-foreground border-border";
};

export const formatNotificationTime = (createdAt: string) => {
  const date = new Date(createdAt);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
