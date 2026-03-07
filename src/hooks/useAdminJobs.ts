import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const STALE_TIME = 60 * 1000;
export const ADMIN_JOBS_PAGE_SIZE = 20;

export type AdminJobStatus = 'open' | 'expired' | 'flagged' | 'closed' | 'draft';
export type AdminJobFilterStatus = 'all' | 'active' | 'expired' | 'flagged';

export interface AdminJob {
    id: string;
    title: string;
    description: string | null;
    location: string | null;
    salary: string | null;
    skills: string[];
    status: AdminJobStatus;
    applications_count: number;
    created_at: string;
    organization_id: string | null;
    company_name: string;
}

export interface AdminJobsFilters {
    page: number;
    limit?: number;
    search?: string;
    status?: AdminJobFilterStatus;
}

export interface AdminJobsResult {
    jobs: AdminJob[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
}

interface AdminJobRow {
    id: string;
    title: string | null;
    description?: string | null;
    location?: string | null;
    status: string | null;
    created_at: string;
    organization_id: string | null;
    skills?: string[] | null;
    salary_min?: number | null;
    salary_max?: number | null;
    salary_range_text?: string | null;
    organizations?: { name?: string | null } | Array<{ name?: string | null }> | null;
}

interface UpdateJobInput {
    title: string;
    description: string;
    location: string;
    salary: string;
    skills: string[];
    status: AdminJobStatus;
}

const normalizeStatus = (value: string | null | undefined): AdminJobStatus => {
    if (value === 'expired' || value === 'flagged' || value === 'closed' || value === 'draft') return value;
    return 'open';
};

const toSkillsArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((item) => String(item || '').trim())
        .filter(Boolean);
};

const formatSalaryFromRow = (row: AdminJobRow) => {
    if (row.salary_range_text) return row.salary_range_text;
    const hasMin = typeof row.salary_min === 'number';
    const hasMax = typeof row.salary_max === 'number';
    if (hasMin && hasMax) return `${row.salary_min}-${row.salary_max}`;
    if (hasMin) return String(row.salary_min);
    if (hasMax) return String(row.salary_max);
    return null;
};

const getOrganizationName = (value: AdminJobRow['organizations']) => {
    if (!value) return 'Unknown Company';
    if (Array.isArray(value)) return value[0]?.name || 'Unknown Company';
    return value.name || 'Unknown Company';
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

const buildJobsQuery = (
    filters: AdminJobsFilters,
    orgIds: string[],
    includeRichFields: boolean,
    includeSkillsField: boolean,
) => {
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Number(filters.limit || ADMIN_JOBS_PAGE_SIZE);
    const offset = (page - 1) * limit;
    const search = (filters.search || '').trim();

    const fields = [
        'id',
        'title',
        includeRichFields ? 'description' : null,
        includeRichFields ? 'location' : null,
        'status',
        'created_at',
        'organization_id',
        includeRichFields ? 'salary_min' : null,
        includeRichFields ? 'salary_max' : null,
        includeRichFields ? 'salary_range_text' : null,
        includeSkillsField ? 'skills' : null,
        'organizations(name)',
    ]
        .filter(Boolean)
        .join(', ');

    let query = supabase
        .from('jobs')
        .select(fields, { count: 'exact' });

    const statusFilter = filters.status || 'all';
    if (statusFilter === 'active') query = query.eq('status', 'open');
    if (statusFilter === 'expired') query = query.eq('status', 'expired');
    if (statusFilter === 'flagged') query = query.eq('status', 'flagged');

    if (search) {
        const term = `%${search.replace(/[%_,]/g, '').trim()}%`;
        if (orgIds.length > 0) {
            query = query.or(`title.ilike.${term},organization_id.in.(${orgIds.join(',')})`);
        } else {
            query = query.ilike('title', term);
        }
    }

    return query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
};

const fetchJobsRows = async (filters: AdminJobsFilters, orgIds: string[]) => {
    let result = await buildJobsQuery(filters, orgIds, true, true);
    if (!result.error) return result;

    result = await buildJobsQuery(filters, orgIds, true, false);
    if (!result.error) return result;

    result = await buildJobsQuery(filters, orgIds, false, false);
    return result;
};

const getApplicationsCountByJobId = async (jobIds: string[]) => {
    const map = new Map<string, number>();
    if (jobIds.length === 0) return map;

    const { data, error } = await supabase
        .from('applications')
        .select('job_id')
        .in('job_id', jobIds);

    if (error) return map;

    (data || []).forEach((row: { job_id: string | null }) => {
        if (!row.job_id) return;
        map.set(row.job_id, (map.get(row.job_id) || 0) + 1);
    });

    return map;
};

const parseSalary = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return { salaryMin: null as number | null, salaryMax: null as number | null, salaryText: null as string | null };

    const rangeMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[-:]\s*(\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
        return {
            salaryMin: Number(rangeMatch[1]),
            salaryMax: Number(rangeMatch[2]),
            salaryText: trimmed,
        };
    }

    const singleValue = Number(trimmed.replace(/[^\d.]/g, ''));
    if (Number.isFinite(singleValue) && singleValue > 0) {
        return {
            salaryMin: singleValue,
            salaryMax: null,
            salaryText: trimmed,
        };
    }

    return { salaryMin: null, salaryMax: null, salaryText: trimmed };
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
            p_entity_type: 'job',
            p_entity_id: params.entityId || null,
            p_metadata: params.metadata || {},
        });
    } catch {
        // Non-blocking for primary workflow.
    }
};

export async function getJobs(filters: AdminJobsFilters): Promise<AdminJobsResult> {
    const page = Math.max(1, Number(filters.page || 1));
    const limit = Number(filters.limit || ADMIN_JOBS_PAGE_SIZE);
    const searchOrgIds = await getSearchMatchedOrgIds(filters.search || '');

    const { data, error, count } = await fetchJobsRows(filters, searchOrgIds);
    if (error) throw error;

    const rows = (data || []) as AdminJobRow[];
    const appCounts = await getApplicationsCountByJobId(rows.map((row) => row.id));

    const jobs: AdminJob[] = rows.map((row) => ({
        id: row.id,
        title: row.title || 'Untitled Job',
        description: row.description ?? null,
        location: row.location ?? null,
        salary: formatSalaryFromRow(row),
        skills: toSkillsArray(row.skills),
        status: normalizeStatus(row.status),
        applications_count: appCounts.get(row.id) || 0,
        created_at: row.created_at,
        organization_id: row.organization_id,
        company_name: getOrganizationName(row.organizations),
    }));

    const total = Number(count || 0);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
        jobs,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
    };
}

export async function updateJob(jobId: string, updates: UpdateJobInput) {
    const parsedSalary = parseSalary(updates.salary);

    const basePayload = {
        title: updates.title.trim(),
        description: updates.description.trim(),
        location: updates.location.trim(),
        skills: updates.skills,
        status: updates.status,
    };

    const payloads = [
        {
            ...basePayload,
            salary_min: parsedSalary.salaryMin,
            salary_max: parsedSalary.salaryMax,
            salary_range_text: parsedSalary.salaryText,
        },
        {
            ...basePayload,
            salary_min: parsedSalary.salaryMin,
            salary_max: parsedSalary.salaryMax,
        },
        basePayload,
    ];

    let lastError: any = null;
    for (const payload of payloads) {
        const { error } = await supabase
            .from('jobs')
            .update(payload)
            .eq('id', jobId);

        if (!error) return;
        lastError = error;
    }

    throw lastError;
}

export async function deleteJob(jobId: string) {
    const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', jobId);

    if (error) throw error;
}

export async function flagJob(jobId: string) {
    const { error } = await supabase
        .from('jobs')
        .update({ status: 'flagged' })
        .eq('id', jobId);

    if (error) throw error;
}

export function useAdminJobs(filters: AdminJobsFilters) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const jobsQuery = useQuery({
        queryKey: [
            'admin-jobs',
            user?.id,
            filters.page,
            filters.limit || ADMIN_JOBS_PAGE_SIZE,
            filters.search || '',
            filters.status || 'all',
        ],
        queryFn: () => getJobs(filters),
        enabled: !!user,
        staleTime: STALE_TIME,
        placeholderData: keepPreviousData,
    });

    const updateMutation = useMutation({
        mutationFn: async (params: {
            jobId: string;
            organizationId?: string | null;
            updates: UpdateJobInput;
        }) => updateJob(params.jobId, params.updates),
        onSuccess: async (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
            await logAuditEvent({
                actorUserId: user?.id,
                organizationId: variables.organizationId || null,
                action: 'job_updated',
                entityId: variables.jobId,
                metadata: {
                    title: variables.updates.title,
                    status: variables.updates.status,
                },
            });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (params: { jobId: string; organizationId?: string | null; title?: string | null }) =>
            deleteJob(params.jobId),
        onSuccess: async (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
            await logAuditEvent({
                actorUserId: user?.id,
                organizationId: variables.organizationId || null,
                action: 'job_deleted',
                entityId: variables.jobId,
                metadata: {
                    title: variables.title || null,
                },
            });
        },
    });

    const flagMutation = useMutation({
        mutationFn: async (params: { jobId: string; organizationId?: string | null; title?: string | null }) =>
            flagJob(params.jobId),
        onSuccess: async (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['admin-jobs'] });
            await logAuditEvent({
                actorUserId: user?.id,
                organizationId: variables.organizationId || null,
                action: 'job_flagged',
                entityId: variables.jobId,
                metadata: {
                    title: variables.title || null,
                    status: 'flagged',
                },
            });
        },
    });

    return {
        jobs: jobsQuery.data?.jobs || [],
        pagination: jobsQuery.data || {
            jobs: [],
            total: 0,
            page: filters.page,
            limit: filters.limit || ADMIN_JOBS_PAGE_SIZE,
            totalPages: 1,
            hasNextPage: false,
        },
        isLoading: jobsQuery.isLoading,
        isFetching: jobsQuery.isFetching,
        error: jobsQuery.error,
        getJobs: jobsQuery.refetch,
        updateJob: updateMutation.mutateAsync,
        deleteJob: deleteMutation.mutateAsync,
        flagJob: flagMutation.mutateAsync,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isFlagging: flagMutation.isPending,
    };
}
