import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const STALE_TIME = 60000;
export const ADMIN_RECRUITER_VERIFICATION_PAGE_SIZE = 20;

export type RecruiterOrganizationType = "employer" | "agency";
export type RecruiterVerificationStatus = "pending" | "verified" | "rejected";

export interface RecruiterDocument {
  fileName: string;
  url: string;
}

export interface AdminRecruiterVerificationItem {
  recruiter_id: string;
  recruiter_name: string;
  email: string | null;
  organization_id: string | null;
  company_name: string;
  organization_type: RecruiterOrganizationType;
  country: string | null;
  verification_status: RecruiterVerificationStatus;
  documents: RecruiterDocument[];
  created_at: string;
}

export interface RecruiterVerificationFilters {
  page: number;
  limit?: number;
  search?: string;
  status?: "all" | RecruiterVerificationStatus;
  organizationType?: "all" | RecruiterOrganizationType;
}

export interface RecruiterVerificationResult {
  recruiters: AdminRecruiterVerificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
}

interface RecruiterRow {
  id: string;
  full_name: string | null;
  role: string | null;
  organization_id: string | null;
  verification_status?: string | null;
  verification_documents?: string[] | null;
  created_at: string;
  organizations?:
    | {
        id?: string | null;
        name?: string | null;
        type?: string | null;
        country?: string | null;
      }
    | Array<{
        id?: string | null;
        name?: string | null;
        type?: string | null;
        country?: string | null;
      }>
    | null;
}

interface AuthLookupRow {
  id: string;
  email: string | null;
}

const getOrganization = (value: RecruiterRow["organizations"]) => {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] || null;
  return value;
};

const normalizeOrganizationType = (value: string | null | undefined): RecruiterOrganizationType =>
  value === "agency" ? "agency" : "employer";

const normalizeVerificationStatus = (value: string | null | undefined): RecruiterVerificationStatus => {
  if (value === "verified" || value === "rejected") return value;
  return "pending";
};

const buildSearchPattern = (value: string) => `%${value.replace(/[%_,]/g, "").trim()}%`;

const getFileNameFromUrl = (url: string) => {
  try {
    return decodeURIComponent(url.split("/").pop() || "Document");
  } catch {
    return "Document";
  }
};

const fetchAuthLookupByUserIds = async (userIds: string[]) => {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const lookup = new Map<string, AuthLookupRow>();
  if (uniqueIds.length === 0) return lookup;

  const { data, error } = await supabase.rpc("get_all_users").in("id", uniqueIds);
  if (error || !Array.isArray(data)) return lookup;

  data.forEach((row: any) => {
    if (!row?.id) return;
    lookup.set(row.id, {
      id: row.id,
      email: row.email ?? null,
    });
  });

  return lookup;
};

const getSearchMatchedOrganizationIds = async (search: string) => {
  const term = search.trim();
  if (!term) return [];

  const { data, error } = await supabase
    .from("organizations")
    .select("id")
    .ilike("name", buildSearchPattern(term))
    .limit(300);

  if (error || !Array.isArray(data)) return [];
  return data.map((row: any) => row.id).filter(Boolean);
};

const buildRecruitersQuery = (
  filters: RecruiterVerificationFilters,
  matchedOrgIds: string[],
  includeCountry: boolean,
) => {
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Number(filters.limit || ADMIN_RECRUITER_VERIFICATION_PAGE_SIZE);
  const offset = (page - 1) * limit;
  const search = (filters.search || "").trim();

  const orgFields = includeCountry ? "id, name, type, country" : "id, name, type";

  let query = supabase
    .from("profiles")
    .select(`id, full_name, role, organization_id, verification_status, verification_documents, created_at, organizations(${orgFields})`, { count: "exact" })
    .in("role", ["employer", "agency"]);

  if (filters.organizationType && filters.organizationType !== "all") {
    query = query.eq("role", filters.organizationType);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("verification_status", filters.status);
  }

  if (search) {
    const pattern = buildSearchPattern(search);
    if (matchedOrgIds.length > 0) {
      query = query.or(`full_name.ilike.${pattern},organization_id.in.(${matchedOrgIds.join(",")})`);
    } else {
      query = query.ilike("full_name", pattern);
    }
  }

  return query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
};

export async function getRecruiterVerification(
  filters: RecruiterVerificationFilters,
): Promise<RecruiterVerificationResult> {
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Number(filters.limit || ADMIN_RECRUITER_VERIFICATION_PAGE_SIZE);
  const matchedOrgIds = await getSearchMatchedOrganizationIds(filters.search || "");

  let response = await buildRecruitersQuery(filters, matchedOrgIds, true);
  if (response.error) {
    response = await buildRecruitersQuery(filters, matchedOrgIds, false);
  }
  if (response.error) throw response.error;

  const rows = (response.data || []) as RecruiterRow[];
  const authLookup = await fetchAuthLookupByUserIds(rows.map((row) => row.id));

  const recruiters: AdminRecruiterVerificationItem[] = rows.map((row) => {
    const organization = getOrganization(row.organizations);

    return {
      recruiter_id: row.id,
      recruiter_name: row.full_name || "Unknown Recruiter",
      email: authLookup.get(row.id)?.email ?? null,
      organization_id: row.organization_id || organization?.id || null,
      company_name: organization?.name || "Unknown Company",
      organization_type: normalizeOrganizationType(organization?.type || row.role),
      country: organization?.country ?? null,
      verification_status: normalizeVerificationStatus(row.verification_status),
      documents: (row.verification_documents || []).map((url) => ({
        url,
        fileName: getFileNameFromUrl(url),
      })),
      created_at: row.created_at,
    };
  });

  const total = Number(response.count || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    recruiters,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
  };
}

const updateRecruiterVerification = async (params: {
  recruiterId: string;
  status: RecruiterVerificationStatus;
}) => {
  const { error } = await supabase.rpc("set_recruiter_verification_status", {
    p_profile_id: params.recruiterId,
    p_status: params.status,
  });

  if (error) throw error;
};

export async function approveRecruiter(params: { recruiterId: string }) {
  await updateRecruiterVerification({
    recruiterId: params.recruiterId,
    status: "verified",
  });
}

export async function rejectRecruiter(params: { recruiterId: string }) {
  await updateRecruiterVerification({
    recruiterId: params.recruiterId,
    status: "rejected",
  });
}

export function useRecruiterVerification(filters: RecruiterVerificationFilters) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const recruitersQuery = useQuery({
    queryKey: [
      "admin-recruiter-verification",
      user?.id,
      filters.page,
      filters.limit || ADMIN_RECRUITER_VERIFICATION_PAGE_SIZE,
      filters.search || "",
      filters.status || "all",
      filters.organizationType || "all",
    ],
    queryFn: () => getRecruiterVerification(filters),
    enabled: !!user?.id,
    staleTime: STALE_TIME,
    placeholderData: keepPreviousData,
  });

  const approveMutation = useMutation({
    mutationFn: approveRecruiter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recruiter-verification"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectRecruiter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recruiter-verification"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  return {
    recruiters: recruitersQuery.data?.recruiters || [],
    pagination: recruitersQuery.data || {
      recruiters: [],
      total: 0,
      page: filters.page,
      limit: filters.limit || ADMIN_RECRUITER_VERIFICATION_PAGE_SIZE,
      totalPages: 1,
      hasNextPage: false,
    },
    isLoading: recruitersQuery.isLoading,
    isFetching: recruitersQuery.isFetching,
    error: recruitersQuery.error,
    refetch: recruitersQuery.refetch,
    approveRecruiter: approveMutation.mutateAsync,
    rejectRecruiter: rejectMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
