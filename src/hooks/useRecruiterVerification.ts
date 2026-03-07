import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const STALE_TIME = 60000;
export const ADMIN_RECRUITER_VERIFICATION_PAGE_SIZE = 20;

export type RecruiterOrganizationType = "employer" | "agency";
export type RecruiterVerificationStatus = "pending" | "verified" | "rejected";

export interface RecruiterDocument {
  label: "Business License" | "Company Registration" | "Tax Certificate" | "Document";
  fileName: string;
  path: string;
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
  rejection_reason: string | null;
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
  created_at: string;
  organizations?:
    | {
      id?: string | null;
      name?: string | null;
      type?: string | null;
      country?: string | null;
      verification_status?: string | null;
      rejection_reason?: string | null;
    }
    | Array<{
      id?: string | null;
      name?: string | null;
      type?: string | null;
      country?: string | null;
      verification_status?: string | null;
      rejection_reason?: string | null;
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

const classifyDocument = (fileName: string): RecruiterDocument["label"] => {
  const normalized = fileName.toLowerCase();
  if (normalized.includes("tax")) return "Tax Certificate";
  if (normalized.includes("registration")) return "Company Registration";
  if (normalized.includes("license") || normalized.includes("business")) return "Business License";
  return "Document";
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

const listDocumentsAtPath = async (path: string) => {
  const { data, error } = await supabase.storage
    .from("recruiter_documents")
    .list(path, { limit: 50, sortBy: { column: "created_at", order: "desc" } });

  if (error || !Array.isArray(data)) return [];

  return data
    .filter((item: any) => item?.name && !item.name.endsWith("/"))
    .map((item: any) => ({
      fileName: item.name as string,
      path: path ? `${path}/${item.name}` : item.name,
    }));
};

const resolveDocumentUrl = async (path: string) => {
  const signed = await supabase.storage.from("recruiter_documents").createSignedUrl(path, 60 * 60);
  if (!signed.error && signed.data?.signedUrl) return signed.data.signedUrl;
  const publicData = supabase.storage.from("recruiter_documents").getPublicUrl(path);
  return publicData.data.publicUrl;
};

const fetchDocumentsMap = async (rows: RecruiterRow[]) => {
  const map = new Map<string, RecruiterDocument[]>();

  await Promise.all(
    rows.map(async (row) => {
      const org = getOrganization(row.organizations);
      const paths = Array.from(
        new Set(
          [row.organization_id || org?.id || null, row.id]
            .filter(Boolean)
            .flatMap((base) => [base as string, `${base}/documents`]),
        ),
      );

      const uniqueByPath = new Map<string, { fileName: string; path: string }>();
      await Promise.all(
        paths.map(async (path) => {
          const files = await listDocumentsAtPath(path);
          files.forEach((file) => {
            uniqueByPath.set(file.path, file);
          });
        }),
      );

      const docs = await Promise.all(
        Array.from(uniqueByPath.values()).map(async (file) => ({
          label: classifyDocument(file.fileName),
          fileName: file.fileName,
          path: file.path,
          url: await resolveDocumentUrl(file.path),
        })),
      );

      map.set(row.id, docs);
    }),
  );

  return map;
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

const buildRecruitersQuery = async (
  filters: RecruiterVerificationFilters,
  includeOptionalOrgFields: boolean,
  matchedOrgIds: string[],
) => {
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Number(filters.limit || ADMIN_RECRUITER_VERIFICATION_PAGE_SIZE);
  const offset = (page - 1) * limit;
  const search = (filters.search || "").trim();

  const orgFields = includeOptionalOrgFields
    ? "id, name, type, country, verification_status, rejection_reason"
    : "id, name, type, verification_status";

  let query = supabase
    .from("profiles")
    .select(`id, full_name, role, organization_id, created_at, organizations(${orgFields})`, { count: "exact" })
    .in("role", ["employer", "agency"]);

  if (filters.organizationType && filters.organizationType !== "all") {
    query = query.eq("role", filters.organizationType);
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("organizations.verification_status", filters.status);
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

  let response = await buildRecruitersQuery(filters, true, matchedOrgIds);
  if (response.error) {
    response = await buildRecruitersQuery(filters, false, matchedOrgIds);
  }

  if (response.error) throw response.error;

  const rows = (response.data || []) as RecruiterRow[];
  const [authLookup, documentsMap] = await Promise.all([
    fetchAuthLookupByUserIds(rows.map((row) => row.id)),
    fetchDocumentsMap(rows),
  ]);

  const recruiters: AdminRecruiterVerificationItem[] = rows.map((row) => {
    const organization = getOrganization(row.organizations);
    const verificationStatus = normalizeVerificationStatus(organization?.verification_status);
    const organizationType = normalizeOrganizationType(organization?.type || row.role);

    return {
      recruiter_id: row.id,
      recruiter_name: row.full_name || "Unknown Recruiter",
      email: authLookup.get(row.id)?.email ?? null,
      organization_id: row.organization_id || organization?.id || null,
      company_name: organization?.name || "Unknown Company",
      organization_type: organizationType,
      country: organization?.country ?? null,
      verification_status: verificationStatus,
      rejection_reason: organization?.rejection_reason ?? null,
      documents: documentsMap.get(row.id) || [],
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

const notifyRecruiter = async (params: {
  recruiterId: string;
  title: string;
  message: string;
  type?: string;
}) => {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.recruiterId,
    title: params.title,
    message: params.message,
    type: params.type || "recruiter",
  });

  if (error) throw error;
};

const updateOrganizationVerification = async (
  organizationId: string,
  updates: { verification_status: RecruiterVerificationStatus; rejection_reason?: string | null },
) => {
  let result = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", organizationId);

  if (!result.error) return;

  result = await supabase
    .from("organizations")
    .update({ verification_status: updates.verification_status })
    .eq("id", organizationId);

  if (result.error) throw result.error;
};

export async function approveRecruiter(params: {
  organizationId: string | null;
  recruiterId: string;
  companyName: string;
}) {
  if (!params.organizationId) throw new Error("Organization not found for recruiter.");

  await updateOrganizationVerification(params.organizationId, {
    verification_status: "verified",
    rejection_reason: null,
  });

  await notifyRecruiter({
    recruiterId: params.recruiterId,
    title: "Recruiter Verification Approved",
    message: `${params.companyName} has been approved as a verified recruiter.`,
    type: "recruiter",
  });
}

export async function rejectRecruiter(params: {
  organizationId: string | null;
  recruiterId: string;
  companyName: string;
  reason?: string;
}) {
  if (!params.organizationId) throw new Error("Organization not found for recruiter.");

  await updateOrganizationVerification(params.organizationId, {
    verification_status: "rejected",
    rejection_reason: params.reason?.trim() || null,
  });

  await notifyRecruiter({
    recruiterId: params.recruiterId,
    title: "Recruiter Verification Rejected",
    message: params.reason?.trim()
      ? `Verification for ${params.companyName} was rejected. Reason: ${params.reason.trim()}`
      : `Verification for ${params.companyName} was rejected.`,
    type: "recruiter",
  });
}

export async function requestAdditionalDocuments(params: {
  recruiterId: string;
  companyName: string;
  message?: string;
}) {
  const body = params.message?.trim()
    ? params.message.trim()
    : `Please upload additional company verification documents for ${params.companyName}.`;

  await notifyRecruiter({
    recruiterId: params.recruiterId,
    title: "Additional Verification Documents Required",
    message: body,
    type: "recruiter",
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
    },
  });

  const rejectMutation = useMutation({
    mutationFn: rejectRecruiter,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-recruiter-verification"] });
    },
  });

  const requestDocsMutation = useMutation({
    mutationFn: requestAdditionalDocuments,
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
    requestAdditionalDocuments: requestDocsMutation.mutateAsync,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isRequestingDocuments: requestDocsMutation.isPending,
  };
}
