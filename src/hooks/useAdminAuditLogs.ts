import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const STALE_TIME = 60 * 1000;
export const ADMIN_AUDIT_LOGS_PAGE_SIZE = 20;

export interface AdminAuditLog {
    id: string;
    action: string;
    entity_type: string;
    user_id: string | null;
    user_name: string;
    organization_id: string | null;
    organization_name: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export interface AdminAuditLogsFilters {
    page: number;
    limit?: number;
    search?: string;
    action?: string;
    entityType?: string;
}

export interface AdminAuditLogsResult {
    logs: AdminAuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
}

interface AuditRow {
    id: string;
    user_id: string | null;
    organization_id: string | null;
    action: string;
    entity_type: string;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

const sanitizeSearch = (value: string) => `%${value.replace(/[%_,]/g, '').trim()}%`;

const getMatchedUserIds = async (search: string) => {
    if (!search.trim()) return [];
    const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', sanitizeSearch(search))
        .limit(300);

    if (error) return [];
    return (data || []).map((row: { id: string }) => row.id);
};

const getMatchedOrgIds = async (search: string) => {
    if (!search.trim()) return [];
    const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .ilike('name', sanitizeSearch(search))
        .limit(300);

    if (error) return [];
    return (data || []).map((row: { id: string }) => row.id);
};

const getNameMaps = async (rows: AuditRow[]) => {
    const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter((id): id is string => !!id)));
    const orgIds = Array.from(new Set(rows.map((row) => row.organization_id).filter((id): id is string => !!id)));

    const [profilesRes, orgsRes] = await Promise.all([
        userIds.length > 0
            ? supabase.from('profiles').select('id, full_name').in('id', userIds)
            : Promise.resolve({ data: [], error: null } as any),
        orgIds.length > 0
            ? supabase.from('organizations').select('id, name').in('id', orgIds)
            : Promise.resolve({ data: [], error: null } as any),
    ]);

    const userNameById = new Map<string, string>(
        ((profilesRes.data || []) as Array<{ id: string; full_name: string | null }>).map((row) => [
            row.id,
            row.full_name || 'Unknown user',
        ]),
    );
    const orgNameById = new Map<string, string>(
        ((orgsRes.data || []) as Array<{ id: string; name: string | null }>).map((row) => [
            row.id,
            row.name || 'Unknown organization',
        ]),
    );

    return { userNameById, orgNameById };
};

export async function getAuditLogs(filters: AdminAuditLogsFilters): Promise<AdminAuditLogsResult> {
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Number(filters.limit || ADMIN_AUDIT_LOGS_PAGE_SIZE);
    const offset = (page - 1) * limit;
    const search = (filters.search || '').trim();

    const [searchUserIds, searchOrgIds] = await Promise.all([
        getMatchedUserIds(search),
        getMatchedOrgIds(search),
    ]);

    let query = supabase
        .from('audit_logs')
        .select('id, user_id, organization_id, action, entity_type, metadata, created_at', { count: 'exact' });

    if (filters.action && filters.action !== 'all') {
        query = query.eq('action', filters.action);
    }

    if (filters.entityType && filters.entityType !== 'all') {
        query = query.eq('entity_type', filters.entityType);
    }

    if (search) {
        const term = sanitizeSearch(search);
        const clauses = [
            `action.ilike.${term}`,
            `entity_type.ilike.${term}`,
        ];
        if (searchUserIds.length > 0) {
            clauses.push(`user_id.in.(${searchUserIds.join(',')})`);
        }
        if (searchOrgIds.length > 0) {
            clauses.push(`organization_id.in.(${searchOrgIds.join(',')})`);
        }
        query = query.or(clauses.join(','));
    }

    const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw error;

    const rows = (data || []) as AuditRow[];
    const names = await getNameMaps(rows);

    const logs = rows.map((row) => ({
        id: row.id,
        action: row.action,
        entity_type: row.entity_type,
        user_id: row.user_id,
        user_name: row.user_id ? names.userNameById.get(row.user_id) || 'Unknown user' : 'System',
        organization_id: row.organization_id,
        organization_name: row.organization_id
            ? names.orgNameById.get(row.organization_id) || 'Unknown organization'
            : 'Global',
        metadata: row.metadata || {},
        created_at: row.created_at,
    }));

    const total = Number(count || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
        logs,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
    };
}

export function useAdminAuditLogs(filters: AdminAuditLogsFilters) {
    const { user } = useAuth();

    const query = useQuery({
        queryKey: [
            'admin-audit-logs-v2',
            user?.id,
            filters.page,
            filters.limit || ADMIN_AUDIT_LOGS_PAGE_SIZE,
            filters.search || '',
            filters.action || 'all',
            filters.entityType || 'all',
        ],
        queryFn: () => getAuditLogs(filters),
        enabled: !!user,
        staleTime: STALE_TIME,
        placeholderData: keepPreviousData,
    });

    return {
        logs: query.data?.logs || [],
        pagination: query.data || {
            logs: [],
            total: 0,
            page: filters.page,
            limit: filters.limit || ADMIN_AUDIT_LOGS_PAGE_SIZE,
            totalPages: 1,
            hasNextPage: false,
        },
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        refetch: query.refetch,
    };
}
