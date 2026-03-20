import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const STALE_TIME = 60 * 1000;
export const ADMIN_SUBSCRIPTIONS_PAGE_SIZE = 20;

export type AdminSubscriptionStatus = 'active' | 'suspended' | 'cancelled' | 'expired';
export type AdminSubscriptionStatusFilter = 'all' | AdminSubscriptionStatus;

export interface AdminSubscription {
    id: string;
    organization_id: string;
    company_name: string;
    plan_name: string;
    plan_type: string | null;
    job_posting_slots: number;
    resume_search_access: boolean;
    billing_cycle: 'monthly' | 'quarterly' | 'yearly';
    status: AdminSubscriptionStatus;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
}

export interface AdminSubscriptionsFilters {
    page: number;
    limit?: number;
    search?: string;
    status?: AdminSubscriptionStatusFilter;
}

export interface AdminSubscriptionsResult {
    subscriptions: AdminSubscription[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
}

interface SubscriptionRow {
    id: string;
    organization_id: string;
    plan_type?: string | null;
    status?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    created_at: string;
    usage_limit?: number | null;
    remaining_slots?: number | null;
    is_active?: boolean | null;
    billing_cycle?: string | null;
    organizations?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

const getCompanyName = (value: SubscriptionRow['organizations']) => {
    if (!value) return 'Unknown Company';
    if (Array.isArray(value)) return value[0]?.name || 'Unknown Company';
    return value.name || 'Unknown Company';
};

const inferBillingCycle = (startDate: string | null | undefined, endDate: string | null | undefined) => {
    if (!startDate || !endDate) return 'monthly' as const;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 'monthly' as const;
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    if (days <= 45) return 'monthly' as const;
    if (days <= 120) return 'quarterly' as const;
    return 'yearly' as const;
};

const normalizeBillingCycle = (value: string | null | undefined, startDate: string | null | undefined, endDate: string | null | undefined) => {
    if (value === 'monthly' || value === 'quarterly' || value === 'yearly') return value;
    return inferBillingCycle(startDate, endDate);
};

const normalizePlanName = (planType: string | null | undefined) => {
    if (planType === 'job_slot_basic') return 'Single Job Slot';
    if (planType === 'job_slot_pro') return '10 Job Slots';
    if (planType === 'job_slot_invite') return 'Invite Job Slots';
    if (planType === 'full_access') return 'Full Access Invite';
    if (planType === 'resume_search') return 'Resume Search Access';
    return 'Unknown Plan';
};

const normalizeStatus = (row: SubscriptionRow): AdminSubscriptionStatus => {
    const status = (row.status || '').toLowerCase();
    if (status === 'active' || status === 'cancelled' || status === 'expired' || status === 'suspended') {
        return status as AdminSubscriptionStatus;
    }

    if (row.is_active === false) return 'suspended';
    if (row.end_date && new Date(row.end_date).getTime() < Date.now()) return 'expired';
    return 'active';
};

const getPostingSlots = (row: SubscriptionRow) => {
    if (row.plan_type === 'resume_search') return 0;
    if (typeof row.usage_limit === 'number') return row.usage_limit;
    if (typeof row.remaining_slots === 'number') return row.remaining_slots;
    if (row.plan_type === 'job_slot_basic') return 1;
    if (row.plan_type === 'job_slot_pro') return 10;
    if (row.plan_type === 'job_slot_invite') return 0;
    if (row.plan_type === 'full_access') return 10;
    return 0;
};

const getSearchMatchedOrgIds = async (search: string) => {
    if (!search.trim()) return [];
    const { data, error } = await supabase
        .from('organizations')
        .select('id')
        .ilike('name', `%${search.replace(/[%_,]/g, '').trim()}%`)
        .limit(300);

    if (error) return [];
    return (data || []).map((row: { id: string }) => row.id);
};

const buildSubscriptionsQuery = (
    filters: AdminSubscriptionsFilters,
    orgIds: string[],
    includeOptionalFields: boolean,
) => {
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Number(filters.limit || ADMIN_SUBSCRIPTIONS_PAGE_SIZE);
    const offset = (page - 1) * limit;
    const search = (filters.search || '').trim();

    const fields = [
        'id',
        'organization_id',
        'plan_type',
        'status',
        'start_date',
        'end_date',
        'created_at',
        includeOptionalFields ? 'usage_limit' : null,
        includeOptionalFields ? 'remaining_slots' : null,
        includeOptionalFields ? 'is_active' : null,
        includeOptionalFields ? 'billing_cycle' : null,
        'organizations(name)',
    ]
        .filter(Boolean)
        .join(', ');

    let query = supabase.from('subscriptions').select(fields, { count: 'exact' });

    if (search) {
        if (orgIds.length > 0) {
            query = query.in('organization_id', orgIds);
        } else {
            query = query.eq('organization_id', '00000000-0000-0000-0000-000000000000');
        }
    }

    if (filters.status && filters.status !== 'all') {
        if (filters.status === 'suspended') {
            query = query.or('status.eq.suspended,is_active.eq.false');
        } else {
            query = query.eq('status', filters.status);
        }
    }

    return query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
};

const fetchSubscriptionsRows = async (filters: AdminSubscriptionsFilters, orgIds: string[]) => {
    let result = await buildSubscriptionsQuery(filters, orgIds, true);
    if (!result.error) return result;

    result = await buildSubscriptionsQuery(filters, orgIds, false);
    return result;
};

const logAuditEvent = async (params: {
    actorUserId: string | null | undefined;
    organizationId?: string | null;
    action: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
}) => {
    if (!params.actorUserId) return;
    try {
        await supabase.rpc('log_audit_event', {
            p_user_id: params.actorUserId,
            p_org_id: params.organizationId || null,
            p_action: params.action,
            p_entity_type: 'subscription',
            p_entity_id: params.entityId || null,
            p_metadata: params.metadata || {},
        });
    } catch {
        // Non-blocking.
    }
};

export async function getSubscriptions(filters: AdminSubscriptionsFilters): Promise<AdminSubscriptionsResult> {
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Number(filters.limit || ADMIN_SUBSCRIPTIONS_PAGE_SIZE);
    const matchedOrgIds = await getSearchMatchedOrgIds(filters.search || '');

    const { data, error, count } = await fetchSubscriptionsRows(filters, matchedOrgIds);
    if (error) throw error;

    const rows = (data || []) as SubscriptionRow[];
    const subscriptions: AdminSubscription[] = rows.map((row) => ({
        id: row.id,
        organization_id: row.organization_id,
        company_name: getCompanyName(row.organizations),
        plan_name: normalizePlanName(row.plan_type),
        plan_type: row.plan_type || null,
        job_posting_slots: getPostingSlots(row),
        resume_search_access: row.plan_type === 'resume_search' || row.plan_type === 'full_access',
        billing_cycle: normalizeBillingCycle(row.billing_cycle, row.start_date, row.end_date),
        status: normalizeStatus(row),
        start_date: row.start_date || null,
        end_date: row.end_date || null,
        created_at: row.created_at,
    }));

    const total = Number(count || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
        subscriptions,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
    };
}

export async function updateSubscriptionStatus(subscriptionId: string, status: AdminSubscriptionStatus) {
    const updates: Record<string, any> = {
        status,
    };

    if (status === 'cancelled' || status === 'suspended' || status === 'expired') {
        updates.is_active = false;
    }
    if (status === 'active') {
        updates.is_active = true;
    }

    const primary = await supabase
        .from('subscriptions')
        .update(updates)
        .eq('id', subscriptionId);

    if (!primary.error) return;

    if (status === 'suspended') {
        const fallback = await supabase
            .from('subscriptions')
            .update({ status: 'expired', is_active: false })
            .eq('id', subscriptionId);
        if (!fallback.error) return;
    }

    throw primary.error;
}

export async function extendSubscription(subscriptionId: string, currentEndDate: string | null, days = 30) {
    const baseDate = currentEndDate ? new Date(currentEndDate) : new Date();
    const nextEnd = new Date(baseDate);
    nextEnd.setDate(nextEnd.getDate() + days);

    const { error } = await supabase
        .from('subscriptions')
        .update({
            end_date: nextEnd.toISOString(),
        })
        .eq('id', subscriptionId);

    if (error) throw error;
}

export function useAdminSubscriptions(filters: AdminSubscriptionsFilters) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const subscriptionsQuery = useQuery({
        queryKey: [
            'admin-subscriptions-v2',
            user?.id,
            filters.page,
            filters.limit || ADMIN_SUBSCRIPTIONS_PAGE_SIZE,
            filters.search || '',
            filters.status || 'all',
        ],
        queryFn: () => getSubscriptions(filters),
        enabled: !!user,
        staleTime: STALE_TIME,
        placeholderData: keepPreviousData,
    });

    const statusMutation = useMutation({
        mutationFn: async (params: {
            subscriptionId: string;
            organizationId: string;
            nextStatus: AdminSubscriptionStatus;
            planName: string;
        }) => updateSubscriptionStatus(params.subscriptionId, params.nextStatus),
        onSuccess: async (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-subscriptions-v2'] });
            await logAuditEvent({
                actorUserId: user?.id,
                organizationId: variables.organizationId,
                action: 'subscription_modified',
                entityId: variables.subscriptionId,
                metadata: {
                    status: variables.nextStatus,
                    plan_name: variables.planName,
                },
            });
        },
    });

    const extendMutation = useMutation({
        mutationFn: async (params: {
            subscriptionId: string;
            organizationId: string;
            currentEndDate: string | null;
            planName: string;
            days?: number;
        }) => extendSubscription(params.subscriptionId, params.currentEndDate, params.days || 30),
        onSuccess: async (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-subscriptions-v2'] });
            await logAuditEvent({
                actorUserId: user?.id,
                organizationId: variables.organizationId,
                action: 'subscription_modified',
                entityId: variables.subscriptionId,
                metadata: {
                    operation: 'extend',
                    days: variables.days || 30,
                    plan_name: variables.planName,
                },
            });
        },
    });

    return {
        subscriptions: subscriptionsQuery.data?.subscriptions || [],
        pagination: subscriptionsQuery.data || {
            subscriptions: [],
            total: 0,
            page: filters.page,
            limit: filters.limit || ADMIN_SUBSCRIPTIONS_PAGE_SIZE,
            totalPages: 1,
            hasNextPage: false,
        },
        isLoading: subscriptionsQuery.isLoading,
        isFetching: subscriptionsQuery.isFetching,
        error: subscriptionsQuery.error,
        getSubscriptions: subscriptionsQuery.refetch,
        updateSubscriptionStatus: statusMutation.mutateAsync,
        extendSubscription: extendMutation.mutateAsync,
        isUpdatingStatus: statusMutation.isPending,
        isExtending: extendMutation.isPending,
    };
}
