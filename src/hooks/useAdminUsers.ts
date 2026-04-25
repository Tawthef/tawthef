import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const METRICS_STALE_TIME = 60 * 1000;
export const ADMIN_USERS_PAGE_SIZE = 20;

export type AdminUserRole = 'candidate' | 'employer' | 'agency' | 'admin';
export type AdminUserStatus = 'active' | 'suspended';
export type AdminUserTypeFilter = 'all' | 'candidate' | 'employer' | 'agency' | 'admin';

export interface AdminUser {
    id: string;
    full_name: string | null;
    email: string | null;
    role: AdminUserRole;
    organization_id: string | null;
    organization_name: string | null;
    status: AdminUserStatus;
    created_at: string;
    last_login: string | null;
}

export interface AdminUsersFilters {
    page: number;
    limit?: number;
    search?: string;
    userType?: AdminUserTypeFilter;
    status?: 'all' | AdminUserStatus;
}

export interface AdminUsersResult {
    users: AdminUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
}

export interface AdminUserActivity {
    accountCreated: string | null;
    lastLogin: string | null;
    loginCount: number;
    applicationsSubmitted: number;
}

interface ProfileRow {
    id: string;
    full_name: string | null;
    role: string | null;
    status?: string | null;
    organization_id: string | null;
    created_at: string;
    organizations?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

interface AuthLookupRow {
    id: string;
    email: string | null;
    last_sign_in_at: string | null;
}

const getOrganizationName = (value: ProfileRow['organizations']) => {
    if (!value) return null;
    if (Array.isArray(value)) return value[0]?.name || null;
    return value.name || null;
};

const normalizeRole = (role: string | null | undefined): AdminUserRole => {
    if (role === 'employer' || role === 'agency' || role === 'admin') return role;
    return 'candidate';
};

const normalizeStatus = (status: string | null | undefined): AdminUserStatus => {
    if (status === 'suspended') return 'suspended';
    return 'active';
};

const applyUserTypeFilter = (query: any, userType: AdminUserTypeFilter) => {
    if (userType === 'candidate') return query.eq('role', 'candidate');
    if (userType === 'employer') return query.eq('role', 'employer');
    if (userType === 'agency') return query.eq('role', 'agency');
    if (userType === 'admin') return query.eq('role', 'admin');
    return query;
};

const buildSearchPattern = (term: string) => `%${term.replace(/[%_,]/g, '').trim()}%`;

const getSearchMatchedUserIds = async (search: string) => {
    if (!search) return [];

    let query = supabase.rpc('get_all_users');
    query = query.ilike('email', buildSearchPattern(search)).limit(300);

    const { data, error } = await query;
    if (error || !Array.isArray(data)) return [];
    return data.map((row: any) => row.id).filter(Boolean);
};

const fetchAuthLookupByUserIds = async (userIds: string[]): Promise<Map<string, AuthLookupRow>> => {
    const lookup = new Map<string, AuthLookupRow>();
    if (userIds.length === 0) return lookup;

    const { data: rpcRows, error: rpcError } = await supabase
        .rpc('get_all_users')
        .in('id', userIds);

    if (!rpcError && Array.isArray(rpcRows)) {
        rpcRows.forEach((row: any) => {
            lookup.set(row.id, {
                id: row.id,
                email: row.email ?? null,
                last_sign_in_at: row.last_sign_in_at ?? null,
            });
        });
        return lookup;
    }

    await Promise.all(
        userIds.map(async (userId) => {
            const { data, error } = await supabase.auth.admin.getUserById(userId);
            if (error || !data?.user) return;
            lookup.set(userId, {
                id: userId,
                email: data.user.email ?? null,
                last_sign_in_at: data.user.last_sign_in_at ?? null,
            });
        }),
    );

    return lookup;
};

const buildProfilesQuery = (
    filters: AdminUsersFilters,
    searchMatchedIds: string[],
    includeStatus: boolean,
) => {
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Number(filters.limit || ADMIN_USERS_PAGE_SIZE);
    const search = (filters.search || '').trim();
    const userType = filters.userType || 'all';
    const status = filters.status || 'all';
    const offset = (page - 1) * limit;

    const fields = includeStatus
        ? 'id, full_name, role, status, organization_id, created_at, organizations(name)'
        : 'id, full_name, role, organization_id, created_at';

    let query = supabase.from('profiles').select(fields, { count: 'exact' });
    query = applyUserTypeFilter(query, userType);

    if (includeStatus && status !== 'all') {
        query = query.eq('status', status);
    }

    if (search) {
        const searchPattern = buildSearchPattern(search);
        if (searchMatchedIds.length > 0) {
            const idCsv = searchMatchedIds.join(',');
            query = query.or(`full_name.ilike.${searchPattern},id.in.(${idCsv})`);
        } else {
            query = query.ilike('full_name', searchPattern);
        }
    }

    return query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);
};

export async function getUsers(filters: AdminUsersFilters): Promise<AdminUsersResult> {
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Number(filters.limit || ADMIN_USERS_PAGE_SIZE);
    const search = (filters.search || '').trim();

    const searchMatchedIds = await getSearchMatchedUserIds(search);

    let result = await buildProfilesQuery(filters, searchMatchedIds, true);
    if (result.error) {
        result = await buildProfilesQuery(filters, searchMatchedIds, false);
    }
    if (result.error) throw result.error;

    const { data, count } = result;

    const rows = ((data || []) as unknown as ProfileRow[]).map((row) => ({
        ...row,
        organizations: row.organizations ?? null,
    }));

    const authLookup = await fetchAuthLookupByUserIds(rows.map((row) => row.id));
    const normalized = rows.map((row): AdminUser => {
        const authRow = authLookup.get(row.id);
        return {
            id: row.id,
            full_name: row.full_name,
            email: authRow?.email ?? null,
            role: normalizeRole(row.role),
            organization_id: row.organization_id,
            organization_name: getOrganizationName(row.organizations),
            status: normalizeStatus(row.status),
            created_at: row.created_at,
            last_login: authRow?.last_sign_in_at ?? null,
        };
    });

    const safeTotal = Number(count || 0);
    const totalPages = Math.max(1, Math.ceil(safeTotal / limit));

    return {
        users: normalized,
        total: safeTotal,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
    };
}

export async function updateUserStatus(userId: string, status: AdminUserStatus) {
    const { error } = await supabase.rpc('update_user_status', {
        p_user_id: userId,
        p_new_status: status,
    });

    if (error) throw error;
}

export async function updateUserRole(userId: string, role: AdminUserRole) {
    const { error } = await supabase.rpc('update_user_role', {
        p_user_id: userId,
        p_new_role: role,
    });

    if (error) throw error;
}

export async function resetUserPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
    });

    if (error) throw error;
}

export async function getUserActivity(userId: string): Promise<AdminUserActivity> {
    const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('id, created_at')
        .eq('id', userId)
        .maybeSingle();

    if (profileError) throw profileError;

    const applicationsRes = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('candidate_id', userId);

    const authLookup = await fetchAuthLookupByUserIds([userId]);
    const authLastLogin = authLookup.get(userId)?.last_sign_in_at ?? null;

    return {
        accountCreated: profileRow?.created_at ?? null,
        lastLogin: authLastLogin,
        loginCount: authLastLogin ? 1 : 0,
        applicationsSubmitted: Number(applicationsRes.count || 0),
    };
}

export function useAdminUsers(filters: AdminUsersFilters) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const usersQuery = useQuery({
        queryKey: [
            'admin-users',
            user?.id,
            filters.page,
            filters.limit || ADMIN_USERS_PAGE_SIZE,
            filters.search || '',
            filters.userType || 'all',
            filters.status || 'all',
        ],
        queryFn: () => getUsers(filters),
        enabled: !!user,
        staleTime: METRICS_STALE_TIME,
        placeholderData: keepPreviousData,
    });

    const updateStatusMutation = useMutation({
        mutationFn: ({ userId, status }: { userId: string; status: AdminUserStatus }) =>
            updateUserStatus(userId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
    });

    const updateRoleMutation = useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: AdminUserRole }) =>
            updateUserRole(userId, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['profile'] });
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: ({ email }: { email: string }) => resetUserPassword(email),
    });

    const userActivityMutation = useMutation({
        mutationFn: ({ userId }: { userId: string }) => getUserActivity(userId),
    });

    return {
        users: usersQuery.data?.users || [],
        pagination: usersQuery.data || {
            users: [],
            total: 0,
            page: filters.page,
            limit: filters.limit || ADMIN_USERS_PAGE_SIZE,
            totalPages: 1,
            hasNextPage: false,
        },
        isLoading: usersQuery.isLoading,
        isFetching: usersQuery.isFetching,
        error: usersQuery.error,
        getUsers: usersQuery.refetch,
        updateUserStatus: updateStatusMutation.mutateAsync,
        updateUserRole: updateRoleMutation.mutateAsync,
        resetUserPassword: resetPasswordMutation.mutateAsync,
        getUserActivity: userActivityMutation.mutateAsync,
        isUpdatingStatus: updateStatusMutation.isPending,
        isUpdatingRole: updateRoleMutation.isPending,
        isResettingPassword: resetPasswordMutation.isPending,
        isLoadingActivity: userActivityMutation.isPending,
    };
}
