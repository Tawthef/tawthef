import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const STALE_TIME = 60 * 1000;
export const ADMIN_ORGANIZATIONS_PAGE_SIZE = 20;

export type OrganizationType = 'employer' | 'agency';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface AdminOrganization {
    id: string;
    name: string;
    type: OrganizationType;
    country: string | null;
    verification_status: VerificationStatus;
    users_count: number;
    active_jobs_count: number;
    total_jobs_count: number;
    created_at: string;
}

export interface OrganizationUser {
    id: string;
    full_name: string | null;
    role: string | null;
    status: 'active' | 'suspended';
    created_at: string;
}

export interface AdminOrganizationsFilters {
    page: number;
    limit?: number;
    search?: string;
    organizationType?: 'all' | OrganizationType;
    verificationStatus?: 'all' | 'verified' | 'pending';
}

export interface AdminOrganizationsResult {
    organizations: AdminOrganization[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
}

interface OrganizationRow {
    id: string;
    name: string | null;
    type: string | null;
    country?: string | null;
    verification_status?: string | null;
    created_at: string;
}

const normalizeType = (value: string | null | undefined): OrganizationType =>
    value === 'agency' ? 'agency' : 'employer';

const normalizeVerificationStatus = (value: string | null | undefined): VerificationStatus => {
    if (value === 'verified' || value === 'rejected') return value;
    return 'pending';
};

const normalizeUserStatus = (value: string | null | undefined): 'active' | 'suspended' =>
    value === 'suspended' ? 'suspended' : 'active';

const sanitizedSearch = (value: string) => `%${value.replace(/[%_,]/g, '').trim()}%`;

const buildOrganizationsQuery = (
    filters: AdminOrganizationsFilters,
    includeOptionalFields: boolean,
    includeCountryInSearch: boolean,
) => {
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Number(filters.limit || ADMIN_ORGANIZATIONS_PAGE_SIZE);
    const offset = (page - 1) * limit;

    const selectFields = includeOptionalFields
        ? 'id, name, type, country, verification_status, created_at'
        : 'id, name, type, created_at';

    let query = supabase
        .from('organizations')
        .select(selectFields, { count: 'exact' });

    if (filters.organizationType && filters.organizationType !== 'all') {
        query = query.eq('type', filters.organizationType);
    }

    if (filters.verificationStatus && filters.verificationStatus !== 'all') {
        query = query.eq('verification_status', filters.verificationStatus);
    }

    const searchValue = (filters.search || '').trim();
    if (searchValue) {
        const term = sanitizedSearch(searchValue);
        if (includeCountryInSearch) {
            query = query.or(`name.ilike.${term},country.ilike.${term}`);
        } else {
            query = query.ilike('name', term);
        }
    }

    return query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
};

const getOrganizationCounts = async (organizationIds: string[]) => {
    if (organizationIds.length === 0) {
        return {
            usersCountByOrg: new Map<string, number>(),
            activeJobsCountByOrg: new Map<string, number>(),
            totalJobsCountByOrg: new Map<string, number>(),
        };
    }

    const [profilesRes, jobsRes] = await Promise.all([
        supabase
            .from('profiles')
            .select('organization_id')
            .in('organization_id', organizationIds),
        supabase
            .from('jobs')
            .select('organization_id, status')
            .in('organization_id', organizationIds),
    ]);

    const usersCountByOrg = new Map<string, number>();
    const activeJobsCountByOrg = new Map<string, number>();
    const totalJobsCountByOrg = new Map<string, number>();

    (profilesRes.data || []).forEach((row: { organization_id: string | null }) => {
        if (!row.organization_id) return;
        usersCountByOrg.set(row.organization_id, (usersCountByOrg.get(row.organization_id) || 0) + 1);
    });

    (jobsRes.data || []).forEach((row: { organization_id: string | null; status: string | null }) => {
        if (!row.organization_id) return;

        totalJobsCountByOrg.set(row.organization_id, (totalJobsCountByOrg.get(row.organization_id) || 0) + 1);
        if (row.status === 'open') {
            activeJobsCountByOrg.set(row.organization_id, (activeJobsCountByOrg.get(row.organization_id) || 0) + 1);
        }
    });

    return { usersCountByOrg, activeJobsCountByOrg, totalJobsCountByOrg };
};

export async function getOrganizations(filters: AdminOrganizationsFilters): Promise<AdminOrganizationsResult> {
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Number(filters.limit || ADMIN_ORGANIZATIONS_PAGE_SIZE);

    let response = await buildOrganizationsQuery(filters, true, true);

    if (response.error) {
        response = await buildOrganizationsQuery(filters, false, false);
    }

    if (response.error) throw response.error;

    const rows = (response.data || []) as OrganizationRow[];
    const organizationIds = rows.map((row) => row.id);
    const counts = await getOrganizationCounts(organizationIds);

    const organizations: AdminOrganization[] = rows.map((row) => ({
        id: row.id,
        name: row.name || 'Unnamed Organization',
        type: normalizeType(row.type),
        country: row.country ?? null,
        verification_status: normalizeVerificationStatus(row.verification_status),
        users_count: counts.usersCountByOrg.get(row.id) || 0,
        active_jobs_count: counts.activeJobsCountByOrg.get(row.id) || 0,
        total_jobs_count: counts.totalJobsCountByOrg.get(row.id) || 0,
        created_at: row.created_at,
    }));

    const total = Number(response.count || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
        organizations,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
    };
}

export async function verifyOrganization(organizationId: string) {
    const { error } = await supabase
        .from('organizations')
        .update({ verification_status: 'verified' })
        .eq('id', organizationId);

    if (error) throw error;
}

export async function rejectOrganization(organizationId: string) {
    const { error } = await supabase
        .from('organizations')
        .update({ verification_status: 'rejected' })
        .eq('id', organizationId);

    if (error) throw error;
}

export async function getOrganizationUsers(organizationId: string): Promise<OrganizationUser[]> {
    const query = await supabase
        .from('profiles')
        .select('id, full_name, role, status, created_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

    let rows = query.data as Array<{
        id: string;
        full_name: string | null;
        role: string | null;
        status?: string | null;
        created_at: string;
    }> | null;

    if (query.error) {
        const fallback = await supabase
            .from('profiles')
            .select('id, full_name, role, created_at')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false });

        if (fallback.error) throw fallback.error;
        rows = (fallback.data || []).map((row: any) => ({ ...row, status: 'active' }));
    }

    return (rows || []).map((row) => ({
        id: row.id,
        full_name: row.full_name,
        role: row.role,
        status: normalizeUserStatus(row.status),
        created_at: row.created_at,
    }));
}

export function useAdminOrganizations(filters: AdminOrganizationsFilters) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const organizationsQuery = useQuery({
        queryKey: [
            'admin-organizations',
            user?.id,
            filters.page,
            filters.limit || ADMIN_ORGANIZATIONS_PAGE_SIZE,
            filters.search || '',
            filters.organizationType || 'all',
            filters.verificationStatus || 'all',
        ],
        queryFn: () => getOrganizations(filters),
        enabled: !!user,
        staleTime: STALE_TIME,
        placeholderData: keepPreviousData,
    });

    const verifyMutation = useMutation({
        mutationFn: ({ organizationId }: { organizationId: string }) => verifyOrganization(organizationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
        },
    });

    const rejectMutation = useMutation({
        mutationFn: ({ organizationId }: { organizationId: string }) => rejectOrganization(organizationId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
        },
    });

    const usersMutation = useMutation({
        mutationFn: ({ organizationId }: { organizationId: string }) => getOrganizationUsers(organizationId),
    });

    return {
        organizations: organizationsQuery.data?.organizations || [],
        pagination: organizationsQuery.data || {
            organizations: [],
            total: 0,
            page: filters.page,
            limit: filters.limit || ADMIN_ORGANIZATIONS_PAGE_SIZE,
            totalPages: 1,
            hasNextPage: false,
        },
        isLoading: organizationsQuery.isLoading,
        isFetching: organizationsQuery.isFetching,
        error: organizationsQuery.error,
        getOrganizations: organizationsQuery.refetch,
        verifyOrganization: verifyMutation.mutateAsync,
        rejectOrganization: rejectMutation.mutateAsync,
        getOrganizationUsers: usersMutation.mutateAsync,
        isVerifying: verifyMutation.isPending,
        isRejecting: rejectMutation.isPending,
        isLoadingOrganizationUsers: usersMutation.isPending,
    };
}
