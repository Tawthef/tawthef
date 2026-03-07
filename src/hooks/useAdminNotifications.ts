import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const STALE_TIME = 60000;
export const ADMIN_NOTIFICATIONS_PAGE_SIZE = 20;

export type AdminNotificationType = "system" | "recruiter" | "candidate" | "announcement";
export type AdminNotificationRecipient = "all" | "recruiters" | "candidates" | "direct";
export type AdminNotificationStatus = "sent" | "archived";

export interface AdminNotificationItem {
  id: string;
  title: string;
  message: string;
  type: AdminNotificationType;
  recipient: string;
  recipient_scope: AdminNotificationRecipient;
  status: AdminNotificationStatus;
  user_id: string;
  created_at: string;
}

export interface AdminNotificationsFilters {
  page: number;
  limit?: number;
  search?: string;
  type?: "all" | AdminNotificationType;
  status?: "all" | AdminNotificationStatus;
}

export interface AdminNotificationsResult {
  notifications: AdminNotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
}

interface NotificationRow {
  id: string;
  user_id: string;
  title: string | null;
  message: string | null;
  type: string | null;
  is_read: boolean | null;
  created_at: string;
  status?: string | null;
  recipient_group?: string | null;
  archived_at?: string | null;
  profiles?: { full_name?: string | null; role?: string | null } | Array<{ full_name?: string | null; role?: string | null }> | null;
}

const normalizeType = (value: string | null | undefined): AdminNotificationType => {
  if (value === "recruiter" || value === "candidate" || value === "announcement") return value;
  return "system";
};

const getProfile = (value: NotificationRow["profiles"]) => {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] || null;
  return value;
};

const normalizeRecipientScope = (row: NotificationRow): AdminNotificationRecipient => {
  const scope = (row.recipient_group || "").toLowerCase();
  if (scope === "all" || scope === "recruiters" || scope === "candidates") return scope as AdminNotificationRecipient;

  const profile = getProfile(row.profiles);
  if (profile?.role === "candidate") return "candidates";
  if (profile?.role === "employer" || profile?.role === "agency") return "recruiters";
  return "direct";
};

const getRecipientLabel = (row: NotificationRow) => {
  const scope = normalizeRecipientScope(row);
  if (scope === "all") return "All users";
  if (scope === "recruiters") return "Recruiters only";
  if (scope === "candidates") return "Candidates only";

  const profile = getProfile(row.profiles);
  if (profile?.full_name) return profile.full_name;
  return row.user_id;
};

const normalizeStatus = (row: NotificationRow): AdminNotificationStatus => {
  const status = (row.status || "").toLowerCase();
  if (status === "archived") return "archived";
  if (row.archived_at) return "archived";
  return "sent";
};

const buildSearchPattern = (value: string) => `%${value.replace(/[%_,]/g, "").trim()}%`;

const buildNotificationsQuery = (filters: AdminNotificationsFilters, includeOptionalFields: boolean) => {
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Number(filters.limit || ADMIN_NOTIFICATIONS_PAGE_SIZE);
  const offset = (page - 1) * limit;
  const search = (filters.search || "").trim();

  const fields = includeOptionalFields
    ? "id, user_id, title, message, type, is_read, created_at, status, recipient_group, archived_at, profiles(full_name, role)"
    : "id, user_id, title, message, type, is_read, created_at, profiles(full_name, role)";

  let query = supabase.from("notifications").select(fields, { count: "exact" });

  if (filters.type && filters.type !== "all") {
    query = query.eq("type", filters.type);
  }

  if (filters.status && filters.status !== "all") {
    if (filters.status === "archived") {
      if (includeOptionalFields) {
        query = query.or("status.eq.archived,archived_at.not.is.null");
      } else {
        query = query.eq("is_read", true);
      }
    } else if (includeOptionalFields) {
      query = query.or("status.eq.sent,status.is.null");
    }
  }

  if (search) {
    const pattern = buildSearchPattern(search);
    query = query.or(`title.ilike.${pattern},message.ilike.${pattern}`);
  }

  return query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
};

export async function getAdminNotifications(filters: AdminNotificationsFilters): Promise<AdminNotificationsResult> {
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Number(filters.limit || ADMIN_NOTIFICATIONS_PAGE_SIZE);

  let response = await buildNotificationsQuery(filters, true);
  if (response.error) {
    response = await buildNotificationsQuery(filters, false);
  }

  if (response.error) throw response.error;

  const rows = (response.data || []) as NotificationRow[];
  const notifications: AdminNotificationItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title || "Notification",
    message: row.message || "",
    type: normalizeType(row.type),
    recipient: getRecipientLabel(row),
    recipient_scope: normalizeRecipientScope(row),
    status: normalizeStatus(row),
    user_id: row.user_id,
    created_at: row.created_at,
  }));

  const total = Number(response.count || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    notifications,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
  };
}

const getRecipientUserIds = async (recipient: Exclude<AdminNotificationRecipient, "direct">) => {
  let query = supabase.from("profiles").select("id");

  if (recipient === "recruiters") {
    query = query.in("role", ["employer", "agency"]);
  } else if (recipient === "candidates") {
    query = query.eq("role", "candidate");
  }

  const { data, error } = await query.limit(10000);
  if (error) throw error;

  return (data || []).map((row: any) => row.id).filter(Boolean);
};

const safeInsertNotifications = async (rows: Array<Record<string, any>>) => {
  if (rows.length === 0) return;

  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from("notifications").insert(chunk);
    if (error) throw error;
  }
};

export async function sendAdminNotification(params: {
  title: string;
  message: string;
  type: AdminNotificationType;
  recipient: Exclude<AdminNotificationRecipient, "direct">;
}) {
  const userIds = await getRecipientUserIds(params.recipient);
  if (userIds.length === 0) return;

  const payload = userIds.map((userId) => ({
    user_id: userId,
    title: params.title.trim(),
    message: params.message.trim(),
    type: params.type,
    status: "sent",
    recipient_group: params.recipient,
  }));

  try {
    await safeInsertNotifications(payload);
  } catch {
    await safeInsertNotifications(
      payload.map((row) => ({
        user_id: row.user_id,
        title: row.title,
        message: row.message,
        type: row.type,
      })),
    );
  }
}

export async function deleteAdminNotification(notificationId: string) {
  const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
  if (error) throw error;
}

export async function resendAdminNotification(notification: AdminNotificationItem) {
  if (notification.recipient_scope === "all" || notification.recipient_scope === "recruiters" || notification.recipient_scope === "candidates") {
    await sendAdminNotification({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      recipient: notification.recipient_scope,
    });
    return;
  }

  const payload = {
    user_id: notification.user_id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    status: "sent",
  };

  const withStatus = await supabase.from("notifications").insert(payload);
  if (!withStatus.error) return;

  const fallback = await supabase.from("notifications").insert({
    user_id: notification.user_id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
  });
  if (fallback.error) throw fallback.error;
}

export async function archiveAdminNotification(notificationId: string) {
  let response = await supabase
    .from("notifications")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (!response.error) return;

  response = await supabase
    .from("notifications")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (!response.error) return;

  const fallback = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId);

  if (fallback.error) throw fallback.error;
}

export function useAdminNotifications(filters: AdminNotificationsFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: [
      "admin-notifications",
      user?.id,
      filters.page,
      filters.limit || ADMIN_NOTIFICATIONS_PAGE_SIZE,
      filters.search || "",
      filters.type || "all",
      filters.status || "all",
    ],
    queryFn: () => getAdminNotifications(filters),
    enabled: !!user?.id,
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });

  const sendMutation = useMutation({
    mutationFn: sendAdminNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ notificationId }: { notificationId: string }) => deleteAdminNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const resendMutation = useMutation({
    mutationFn: ({ notification }: { notification: AdminNotificationItem }) => resendAdminNotification(notification),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ notificationId }: { notificationId: string }) => archiveAdminNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return {
    notifications: notificationsQuery.data?.notifications || [],
    pagination: notificationsQuery.data || {
      notifications: [],
      total: 0,
      page: filters.page,
      limit: filters.limit || ADMIN_NOTIFICATIONS_PAGE_SIZE,
      totalPages: 1,
      hasNextPage: false,
    },
    isLoading: notificationsQuery.isLoading,
    isFetching: notificationsQuery.isFetching,
    error: notificationsQuery.error,
    refetch: notificationsQuery.refetch,
    sendNotification: sendMutation.mutateAsync,
    deleteNotification: deleteMutation.mutateAsync,
    resendNotification: resendMutation.mutateAsync,
    archiveNotification: archiveMutation.mutateAsync,
    isSending: sendMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isResending: resendMutation.isPending,
    isArchiving: archiveMutation.isPending,
  };
}
