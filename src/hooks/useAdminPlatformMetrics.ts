import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const METRICS_STALE_TIME = 60 * 1000;
const THIRTY_DAYS = 30;

export interface SubscriptionSummary {
    active: number;
    trial: number;
    expired: number;
}

export interface ApplicationsTrendPoint {
    date: string;
    label: string;
    applications: number;
}

const getPastThirtyDaysStart = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (THIRTY_DAYS - 1));
    return start;
};

const buildEmptyApplicationsTrend = (startDate: Date): ApplicationsTrendPoint[] => {
    const points: ApplicationsTrendPoint[] = [];
    const cursor = new Date(startDate);

    for (let index = 0; index < THIRTY_DAYS; index += 1) {
        const isoDate = cursor.toISOString().slice(0, 10);
        points.push({
            date: isoDate,
            label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            applications: 0,
        });
        cursor.setDate(cursor.getDate() + 1);
    }

    return points;
};

const getCount = async (table: string, applyFilter?: (query: any) => any) => {
    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    if (applyFilter) {
        query = applyFilter(query);
    }

    const { count, error } = await query;
    if (error) throw error;
    return Number(count || 0);
};

export function useAdminPlatformMetrics() {
    const { user } = useAuth();

    const totalCandidatesQuery = useQuery({
        queryKey: ['admin-platform-metrics', 'totalCandidates', user?.id],
        queryFn: async () => getCount('profiles', (query) => query.eq('role', 'candidate')),
        enabled: !!user,
        staleTime: METRICS_STALE_TIME,
    });

    const totalRecruitersQuery = useQuery({
        queryKey: ['admin-platform-metrics', 'totalRecruiters', user?.id],
        queryFn: async () => getCount('profiles', (query) => query.in('role', ['employer', 'agency'])),
        enabled: !!user,
        staleTime: METRICS_STALE_TIME,
    });

    const activeJobsQuery = useQuery({
        queryKey: ['admin-platform-metrics', 'activeJobs', user?.id],
        queryFn: async () => getCount('jobs', (query) => query.eq('status', 'open')),
        enabled: !!user,
        staleTime: METRICS_STALE_TIME,
    });

    const totalApplicationsQuery = useQuery({
        queryKey: ['admin-platform-metrics', 'totalApplications', user?.id],
        queryFn: async () => getCount('applications'),
        enabled: !!user,
        staleTime: METRICS_STALE_TIME,
    });

    const newRegistrationsQuery = useQuery({
        queryKey: ['admin-platform-metrics', 'newRegistrations', user?.id],
        queryFn: async () => {
            const thirtyDaysAgo = getPastThirtyDaysStart().toISOString();
            return getCount('profiles', (query) => query.gte('created_at', thirtyDaysAgo));
        },
        enabled: !!user,
        staleTime: METRICS_STALE_TIME,
    });

    const subscriptionSummaryQuery = useQuery({
        queryKey: ['admin-platform-metrics', 'subscriptionSummary', user?.id],
        queryFn: async (): Promise<SubscriptionSummary> => {
            const [active, trial, expired] = await Promise.all([
                getCount('subscriptions', (query) => query.eq('status', 'active')),
                getCount('subscriptions', (query) => query.eq('status', 'trial')),
                getCount('subscriptions', (query) => query.eq('status', 'expired')),
            ]);

            return { active, trial, expired };
        },
        enabled: !!user,
        staleTime: METRICS_STALE_TIME,
    });

    const applicationsTrendQuery = useQuery({
        queryKey: ['admin-platform-metrics', 'applicationsTrend', user?.id],
        queryFn: async (): Promise<ApplicationsTrendPoint[]> => {
            const startDate = getPastThirtyDaysStart();
            const emptyTrend = buildEmptyApplicationsTrend(startDate);
            const startIso = startDate.toISOString();

            const { data, error } = await supabase
                .from('applications')
                .select('applied_at')
                .gte('applied_at', startIso)
                .order('applied_at', { ascending: true });

            if (error) throw error;

            const timestamps = (data || [])
                .map((row: { applied_at: string | null }) => row.applied_at)
                .filter(Boolean) as string[];

            const countByDate = new Map(emptyTrend.map((point) => [point.date, 0]));
            timestamps.forEach((timestamp) => {
                const dateKey = new Date(timestamp).toISOString().slice(0, 10);
                if (!countByDate.has(dateKey)) return;
                countByDate.set(dateKey, (countByDate.get(dateKey) || 0) + 1);
            });

            return emptyTrend.map((point) => ({
                ...point,
                applications: countByDate.get(point.date) || 0,
            }));
        },
        enabled: !!user,
        staleTime: METRICS_STALE_TIME,
    });

    const metricQueries = [
        totalCandidatesQuery,
        totalRecruitersQuery,
        activeJobsQuery,
        totalApplicationsQuery,
        newRegistrationsQuery,
        subscriptionSummaryQuery,
    ];

    const firstError = metricQueries.find((query) => query.error)?.error || applicationsTrendQuery.error || null;

    return {
        totalCandidates: totalCandidatesQuery.data || 0,
        totalRecruiters: totalRecruitersQuery.data || 0,
        activeJobs: activeJobsQuery.data || 0,
        totalApplications: totalApplicationsQuery.data || 0,
        newRegistrations: newRegistrationsQuery.data || 0,
        subscriptionSummary: subscriptionSummaryQuery.data || { active: 0, trial: 0, expired: 0 },
        applicationsTrend: applicationsTrendQuery.data || [],
        isMetricsLoading: metricQueries.some((query) => query.isLoading),
        isApplicationsTrendLoading: applicationsTrendQuery.isLoading,
        error: firstError,
    };
}
