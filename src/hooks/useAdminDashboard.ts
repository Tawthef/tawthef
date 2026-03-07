import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const STALE_TIME = 60000;
const MAX_ROWS = 10000;

export interface AdminRecentActivity {
    id: string;
    action_type: string;
    description: string;
    created_at: string;
}

export interface AdminDashboardKpis {
    totalUsers: number;
    totalJobs: number;
    applicationsToday: number;
    activeSubscriptions: number;
    platformActivity: number;
}

export interface AdminDashboardData {
    revenue: {
        total_revenue: number;
        revenue_basic: number;
        revenue_pro: number;
        revenue_resume: number;
        active_subscriptions: number;
        expiring_soon: number;
    };
    stats: {
        total_organizations: number;
        total_employers: number;
        total_agencies: number;
        total_candidates: number;
        total_jobs: number;
        total_applications: number;
    };
    growth: Array<{
        month: string;
        new_users: number;
        new_jobs: number;
        new_subscriptions: number;
    }>;
    expiring_subscriptions: Array<{
        id: string;
        organization_name: string;
        plan_type: string;
        end_date: string;
        days_remaining: number;
        is_active: boolean;
    }>;
    recent_jobs: Array<{
        id: string;
        title: string;
        organization_name: string;
        created_at: string;
        status: string;
    }>;
    recent_hires: Array<{
        id: string;
        candidate_name: string;
        job_title: string;
        organization_name: string;
        hired_at: string;
    }>;
    recent_subscriptions: Array<{
        id: string;
        organization_name: string;
        plan_type: string;
        start_date: string;
        end_date: string;
        is_active: boolean;
    }>;
}

interface ProfileRow {
    id: string;
    full_name?: string | null;
    role?: string | null;
    created_at?: string | null;
}

interface OrganizationRow {
    id: string;
    name?: string | null;
    type?: string | null;
    created_at?: string | null;
}

interface JobRow {
    id: string;
    title?: string | null;
    status?: string | null;
    created_at?: string | null;
    organization_id?: string | null;
}

interface ApplicationRow {
    id: string;
    status?: string | null;
    created_at?: string | null;
    applied_at?: string | null;
    job_id?: string | null;
    candidate_id?: string | null;
}

interface SubscriptionRow {
    id: string;
    organization_id?: string | null;
    plan_type?: string | null;
    status?: string | null;
    is_active?: boolean | null;
    amount?: number | string | null;
    start_date?: string | null;
    end_date?: string | null;
    created_at?: string | null;
}

const toNumber = (value: unknown) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const monthKeyFromDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
};

const buildGrowthBuckets = (months = 6) => {
    const buckets: Array<{ key: string; month: string; new_users: number; new_jobs: number; new_subscriptions: number }> = [];
    const cursor = new Date();
    cursor.setUTCDate(1);
    cursor.setUTCHours(0, 0, 0, 0);
    cursor.setUTCMonth(cursor.getUTCMonth() - (months - 1));

    for (let i = 0; i < months; i += 1) {
        const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`;
        buckets.push({
            key,
            month: cursor.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            new_users: 0,
            new_jobs: 0,
            new_subscriptions: 0,
        });
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return buckets;
};

const isActiveSubscription = (subscription: SubscriptionRow) => {
    if (subscription.is_active === true) return true;
    const status = (subscription.status || '').toLowerCase();
    return status === 'active' || status === 'trial';
};

const selectWithFallback = async <T>(table: string, selects: string[]): Promise<T[]> => {
    let lastError: any = null;

    for (const fields of selects) {
        const response = await supabase.from(table).select(fields).limit(MAX_ROWS);
        if (!response.error) return (response.data || []) as T[];
        lastError = response.error;
    }

    throw lastError || new Error(`Failed to fetch ${table}`);
};

const sortByDateDesc = <T>(rows: T[], getDate: (row: T) => string | null | undefined) =>
    [...rows].sort((a, b) => {
        const left = new Date(getDate(a) || '').getTime();
        const right = new Date(getDate(b) || '').getTime();
        return (Number.isFinite(right) ? right : 0) - (Number.isFinite(left) ? left : 0);
    });

const buildAdminDashboardFromTables = async (): Promise<AdminDashboardData> => {
    const [profiles, organizations, jobs, applications, subscriptions] = await Promise.all([
        selectWithFallback<ProfileRow>('profiles', ['id, full_name, role, created_at']),
        selectWithFallback<OrganizationRow>('organizations', ['id, name, type, created_at']),
        selectWithFallback<JobRow>('jobs', ['id, title, status, created_at, organization_id']),
        selectWithFallback<ApplicationRow>('applications', ['id, status, created_at, applied_at, job_id, candidate_id']),
        selectWithFallback<SubscriptionRow>('subscriptions', [
            'id, organization_id, plan_type, status, is_active, amount, start_date, end_date, created_at',
            'id, organization_id, plan_type, status, is_active, start_date, end_date, created_at',
            'id, organization_id, plan_type, status, start_date, end_date, created_at',
        ]),
    ]);

    const organizationsById = new Map(
        organizations.map((organization) => [organization.id, organization.name || 'Unknown Recruiter']),
    );
    const jobsById = new Map(jobs.map((job) => [job.id, job]));
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile.full_name || 'Candidate']));

    const totalEmployers = organizations.filter((organization) => organization.type === 'employer').length;
    const totalAgencies = organizations.filter((organization) => organization.type === 'agency').length;
    const totalCandidates = profiles.filter((profile) => profile.role === 'candidate').length;

    const now = Date.now();
    const twoWeeksFromNow = now + 14 * 24 * 60 * 60 * 1000;

    let totalRevenue = 0;
    let revenueBasic = 0;
    let revenuePro = 0;
    let revenueResume = 0;

    const activeSubscriptions = subscriptions.filter(isActiveSubscription);
    const expiringSubscriptions = activeSubscriptions
        .map((subscription) => {
            const endDateValue = subscription.end_date ? new Date(subscription.end_date).getTime() : NaN;
            if (!Number.isFinite(endDateValue)) return null;
            if (endDateValue < now || endDateValue > twoWeeksFromNow) return null;

            const daysRemaining = Math.max(0, Math.ceil((endDateValue - now) / (24 * 60 * 60 * 1000)));
            return {
                id: subscription.id,
                organization_name: organizationsById.get(subscription.organization_id || '') || 'Unknown Recruiter',
                plan_type: subscription.plan_type || 'unknown',
                end_date: subscription.end_date as string,
                days_remaining: daysRemaining,
                is_active: true,
            };
        })
        .filter(Boolean) as AdminDashboardData['expiring_subscriptions'];

    subscriptions.forEach((subscription) => {
        const amount = toNumber(subscription.amount);
        if (amount <= 0) return;
        totalRevenue += amount;

        const planType = (subscription.plan_type || '').toLowerCase();
        if (planType.includes('basic')) revenueBasic += amount;
        else if (planType.includes('pro')) revenuePro += amount;
        else if (planType.includes('resume')) revenueResume += amount;
    });

    const growth = buildGrowthBuckets(6);
    const growthByKey = new Map(growth.map((bucket) => [bucket.key, bucket]));

    profiles.forEach((profile) => {
        const key = profile.created_at ? monthKeyFromDate(profile.created_at) : null;
        if (!key || !growthByKey.has(key)) return;
        growthByKey.get(key)!.new_users += 1;
    });

    jobs.forEach((job) => {
        const key = job.created_at ? monthKeyFromDate(job.created_at) : null;
        if (!key || !growthByKey.has(key)) return;
        growthByKey.get(key)!.new_jobs += 1;
    });

    subscriptions.forEach((subscription) => {
        const key = subscription.created_at ? monthKeyFromDate(subscription.created_at) : null;
        if (!key || !growthByKey.has(key)) return;
        growthByKey.get(key)!.new_subscriptions += 1;
    });

    const recentJobs = sortByDateDesc(jobs, (job) => job.created_at).slice(0, 8).map((job) => ({
        id: job.id,
        title: job.title || 'Untitled Job',
        organization_name: organizationsById.get(job.organization_id || '') || 'Unknown Recruiter',
        created_at: job.created_at || new Date().toISOString(),
        status: job.status || 'unknown',
    }));

    const recentHires = sortByDateDesc(
        applications.filter((application) => {
            const normalized = (application.status || '').toLowerCase();
            return normalized === 'hired' || normalized === 'offer_accepted';
        }),
        (application) => application.applied_at || application.created_at,
    )
        .slice(0, 8)
        .map((application) => {
            const job = jobsById.get(application.job_id || '');
            return {
                id: application.id,
                candidate_name: profilesById.get(application.candidate_id || '') || 'Candidate',
                job_title: job?.title || 'Untitled Job',
                organization_name: organizationsById.get(job?.organization_id || '') || 'Unknown Recruiter',
                hired_at: application.applied_at || application.created_at || new Date().toISOString(),
            };
        });

    const recentSubscriptions = sortByDateDesc(subscriptions, (subscription) => subscription.created_at)
        .slice(0, 8)
        .map((subscription) => ({
            id: subscription.id,
            organization_name: organizationsById.get(subscription.organization_id || '') || 'Unknown Recruiter',
            plan_type: subscription.plan_type || 'unknown',
            start_date: subscription.start_date || subscription.created_at || new Date().toISOString(),
            end_date: subscription.end_date || subscription.created_at || new Date().toISOString(),
            is_active: isActiveSubscription(subscription),
        }));

    return {
        revenue: {
            total_revenue: totalRevenue,
            revenue_basic: revenueBasic,
            revenue_pro: revenuePro,
            revenue_resume: revenueResume,
            active_subscriptions: activeSubscriptions.length,
            expiring_soon: expiringSubscriptions.length,
        },
        stats: {
            total_organizations: organizations.length,
            total_employers: totalEmployers,
            total_agencies: totalAgencies,
            total_candidates: totalCandidates,
            total_jobs: jobs.length,
            total_applications: applications.length,
        },
        growth: growth.map(({ key, ...rest }) => rest),
        expiring_subscriptions: expiringSubscriptions,
        recent_jobs: recentJobs,
        recent_hires: recentHires,
        recent_subscriptions: recentSubscriptions,
    };
};

export function useAdminDashboard() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['admin-dashboard', user?.id],
        queryFn: async (): Promise<AdminDashboardData | null> => {
            if (!user) return null;

            const rpcResponse = await supabase.rpc('get_admin_dashboard_data');
            if (!rpcResponse.error && rpcResponse.data) {
                return rpcResponse.data as AdminDashboardData;
            }

            if (rpcResponse.error) {
                console.warn('[useAdminDashboard] Falling back to table queries:', rpcResponse.error.message);
            }
            return buildAdminDashboardFromTables();
        },
        enabled: !!user,
        staleTime: STALE_TIME,
    });

    const activityQuery = useQuery({
        queryKey: ['admin-dashboard-activity', user?.id],
        queryFn: async (): Promise<AdminRecentActivity[]> => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('activity_logs')
                .select('id, action_type, description, created_at')
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;

            return (data || []) as AdminRecentActivity[];
        },
        enabled: !!user,
        staleTime: STALE_TIME,
    });

    const kpiQuery = useQuery({
        queryKey: ['admin-dashboard-kpis', user?.id, query.dataUpdatedAt],
        queryFn: async (): Promise<AdminDashboardKpis> => {
            if (!user) {
                return {
                    totalUsers: 0,
                    totalJobs: 0,
                    applicationsToday: 0,
                    activeSubscriptions: 0,
                    platformActivity: 0,
                };
            }

            const dayStart = new Date();
            dayStart.setHours(0, 0, 0, 0);
            const dayStartIso = dayStart.toISOString();

            const [appsTodayRes, activityTodayRes] = await Promise.all([
                supabase
                    .from('applications')
                    .select('*', { count: 'exact', head: true })
                    .gte('applied_at', dayStartIso),
                supabase
                    .from('activity_logs')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', dayStartIso),
            ]);

            if (appsTodayRes.error) throw appsTodayRes.error;
            if (activityTodayRes.error) throw activityTodayRes.error;

            const summary = query.data;
            const totalUsers =
                Number(summary?.stats?.total_candidates || 0) +
                Number(summary?.stats?.total_employers || 0) +
                Number(summary?.stats?.total_agencies || 0);

            return {
                totalUsers,
                totalJobs: Number(summary?.stats?.total_jobs || 0),
                applicationsToday: Number(appsTodayRes.count || 0),
                activeSubscriptions: Number(summary?.revenue?.active_subscriptions || 0),
                platformActivity: Number(activityTodayRes.count || 0),
            };
        },
        enabled: !!user,
        staleTime: STALE_TIME,
    });

    useEffect(() => {
        if (!user?.id) return;

        const invalidate = () => {
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard-activity', user.id] });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard-kpis', user.id] });
            queryClient.invalidateQueries({ queryKey: ['admin-platform-metrics'] });
            queryClient.invalidateQueries({ queryKey: ['admin-analytics'] });
        };

        const channel = supabase
            .channel(`admin-dashboard-${user.id}-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'organizations' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, invalidate)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, user?.id]);

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
        activity: activityQuery.data || [],
        isActivityLoading: activityQuery.isLoading,
        activityError: activityQuery.error,
        kpis: kpiQuery.data,
        isKpisLoading: kpiQuery.isLoading,
        kpisError: kpiQuery.error,
    };
}
