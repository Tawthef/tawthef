import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const STALE_TIME = 60 * 1000;
const ADMIN_INVITE_CODES_QUERY_KEY = ["admin-invite-codes"] as const;

export type InviteBenefitType = "job_slots" | "full_access";
export type InviteCodeStatus = "active" | "expired" | "exhausted";

export interface AdminInviteCode {
  id: string;
  code: string;
  type: InviteBenefitType;
  value: number;
  expires_at: string | null;
  usage_limit: number;
  used_count: number;
  created_at: string;
  status: InviteCodeStatus;
}

export interface CreateInviteCodeInput {
  code: string;
  type: InviteBenefitType;
  value: number;
  expiresAt: string;
  usageLimit: number;
}

interface InviteCodeRow {
  id: string;
  code: string;
  type: InviteBenefitType;
  value: number | null;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number | null;
  created_at: string;
}

const normalizeCode = (value: string) => value.trim().toUpperCase();

const getStatus = (row: InviteCodeRow): InviteCodeStatus => {
  if ((row.used_count || 0) >= (row.usage_limit || 0)) return "exhausted";
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return "expired";
  return "active";
};

const mapInviteCode = (row: InviteCodeRow): AdminInviteCode => ({
  id: row.id,
  code: row.code,
  type: row.type,
  value: row.value || 0,
  expires_at: row.expires_at,
  usage_limit: row.usage_limit || 0,
  used_count: row.used_count || 0,
  created_at: row.created_at,
  status: getStatus(row),
});

const fetchInviteCodes = async (): Promise<AdminInviteCode[]> => {
  const { data, error } = await supabase
    .from("invite_codes")
    .select("id, code, type, value, expires_at, usage_limit, used_count, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return ((data || []) as InviteCodeRow[]).map(mapInviteCode);
};

const createInviteCode = async (input: CreateInviteCodeInput) => {
  const payload = {
    code: normalizeCode(input.code),
    type: input.type,
    value: Math.max(1, Number(input.value || 1)),
    expires_at: input.expiresAt,
    usage_limit: Math.max(1, Number(input.usageLimit || 1)),
  };

  const { error } = await supabase.from("invite_codes").insert(payload);
  if (error) throw error;
};

export const formatInviteBenefit = (inviteCode: Pick<AdminInviteCode, "type" | "value">) => {
  if (inviteCode.type === "job_slots") {
    return `${Math.max(1, inviteCode.value)} job slot${inviteCode.value === 1 ? "" : "s"}`;
  }

  return `Full access for ${Math.max(1, inviteCode.value)} day${inviteCode.value === 1 ? "" : "s"}`;
};

export function useAdminInviteCodes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const inviteCodesQuery = useQuery({
    queryKey: [...ADMIN_INVITE_CODES_QUERY_KEY, user?.id],
    queryFn: fetchInviteCodes,
    enabled: !!user?.id,
    staleTime: STALE_TIME,
  });

  const createMutation = useMutation({
    mutationFn: createInviteCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_INVITE_CODES_QUERY_KEY });
    },
  });

  useEffect(() => {
    if (!user?.id) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_INVITE_CODES_QUERY_KEY });
    };

    const channel = supabase
      .channel(`admin-invite-codes-${user.id}-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "invite_codes" }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  return {
    inviteCodes: inviteCodesQuery.data || [],
    isLoading: inviteCodesQuery.isLoading,
    error: inviteCodesQuery.error,
    createInviteCode: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    refetch: inviteCodesQuery.refetch,
  };
}
