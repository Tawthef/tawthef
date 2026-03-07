import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const STALE_TIME = 60 * 1000;

export interface AdminAnalyticsPoint {
    key: string;
    label: string;
    value: number;
}

export interface AdminAnalyticsSummary {
    totalCandidates: number;
    totalRecruiters: number;
    activeJobs: number;
    applicationsSubmitted: number;
    candidateGrowth: AdminAnalyticsPoint[];
    jobPostingTrends: AdminAnalyticsPoint[];
    applicationVolume: AdminAnalyticsPoint[];
    recruiterActivity: {
        jobsPosted: number;
        applicationsReviewed: number;
        interviewsScheduled: number;
    };
    platformEngagement: {
        dailyLogins: number;
        activeUsers: number;
        messagesSent: number;
    };
}

const getCount = async (table: string, applyFilter?: (query: any) => any) => {
    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    if (applyFilter) query = applyFilter(query);
    const { count, error } = await query;
    if (error) throw error;
    return Number(count || 0);
};

const monthKey = (date: Date) => date.toISOString().slice(0, 7);

const buildMonthBuckets = (months = 12) => {
    const buckets: AdminAnalyticsPoint[] = [];
    const cursor = new Date();
    cursor.setDate(1);
    cursor.setHours(0, 0, 0, 0);
    cursor.setMonth(cursor.getMonth() - (months - 1));

    for (let index = 0; index < months; index += 1) {
        buckets.push({
            key: monthKey(cursor),
            label: cursor.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            value: 0,
        });
        cursor.setMonth(cursor.getMonth() + 1);
    }

    return buckets;
};

const buildDailyBuckets = (days = 30) => {
    const buckets: AdminAnalyticsPoint[] = [];
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    cursor.setDate(cursor.getDate() - (days - 1));

    for (let index = 0; index < days; index += 1) {
        const key = cursor.toISOString().slice(0, 10);
        buckets.push({
            key,
            label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            value: 0,
        });
        cursor.setDate(cursor.getDate() + 1);
    }

    return buckets;
};

const aggregateByKey = (timestamps: string[], buckets: AdminAnalyticsPoint[], keyFromDate: (date: Date) => string) => {
    const countByKey = new Map<string, number>(buckets.map((bucket) => [bucket.key, 0]));
    timestamps.forEach((value) => {
        const key = keyFromDate(new Date(value));
        if (!countByKey.has(key)) return;
        countByKey.set(key, (countByKey.get(key) || 0) + 1);
    });

    return buckets.map((bucket) => ({ ...bucket, value: countByKey.get(bucket.key) || 0 }));
};

const fetchApplicationTimestamps = async (startIso: string) => {
    const createdRes = await supabase
        .from('applications')
        .select('created_at')
        .gte('created_at', startIso);

    if (!createdRes.error) {
        return (createdRes.data || [])
            .map((row: { created_at: string | null }) => row.created_at)
            .filter(Boolean) as string[];
    }

    const appliedRes = await supabase
        .from('applications')
        .select('applied_at')
        .gte('applied_at', startIso);

    if (appliedRes.error) return [];
    return (appliedRes.data || [])
        .map((row: { applied_at: string | null }) => row.applied_at)
        .filter(Boolean) as string[];
};

export async function getAdminAnalytics(): Promise<AdminAnalyticsSummary> {
    const today = new Date();
    const dayStart = new Date(today);
    dayStart.setHours(0, 0, 0, 0);

    const thirtyDaysStart = new Date(dayStart);
    thirtyDaysStart.setDate(thirtyDaysStart.getDate() - 29);

    const twelveMonthsStart = new Date(dayStart);
    twelveMonthsStart.setDate(1);
    twelveMonthsStart.setMonth(twelveMonthsStart.getMonth() - 11);

    const dayStartIso = dayStart.toISOString();
    const thirtyDaysStartIso = thirtyDaysStart.toISOString();
    const twelveMonthsStartIso = twelveMonthsStart.toISOString();

    const [
        totalCandidates,
        totalRecruiters,
        activeJobs,
        applicationsSubmitted,
        candidateRowsRes,
        jobRowsRes,
        recruiterJobsPosted,
        recruiterApplicationsReviewed,
        recruiterInterviewsScheduled,
        messagesSent,
        usersRpc,
    ] = await Promise.all([
        getCount('profiles', (query) => query.eq('role', 'candidate')),
        getCount('profiles', (query) => query.in('role', ['employer', 'agency'])),
        getCount('jobs', (query) => query.eq('status', 'open')),
        getCount('applications'),
        supabase
            .from('profiles')
            .select('created_at')
            .eq('role', 'candidate')
            .gte('created_at', twelveMonthsStartIso),
        supabase
            .from('jobs')
            .select('created_at')
            .gte('created_at', twelveMonthsStartIso),
        getCount('jobs', (query) => query.gte('created_at', thirtyDaysStartIso)),
        getCount('applications', (query) => query.neq('status', 'applied').gte('applied_at', thirtyDaysStartIso)),
        getCount('interviews', (query) => query.gte('created_at', thirtyDaysStartIso)),
        getCount('messages', (query) => query.gte('created_at', dayStartIso)),
        supabase.rpc('get_all_users'),
    ]);

    const candidateTimestamps = (candidateRowsRes.data || [])
        .map((row: { created_at: string | null }) => row.created_at)
        .filter(Boolean) as string[];

    const jobsTimestamps = (jobRowsRes.data || [])
        .map((row: { created_at: string | null }) => row.created_at)
        .filter(Boolean) as string[];

    const applicationTimestamps = await fetchApplicationTimestamps(thirtyDaysStartIso);

    const candidateGrowth = aggregateByKey(candidateTimestamps, buildMonthBuckets(12), (date) =>
        date.toISOString().slice(0, 7),
    );
    const jobPostingTrends = aggregateByKey(jobsTimestamps, buildMonthBuckets(12), (date) =>
        date.toISOString().slice(0, 7),
    );
    const applicationVolume = aggregateByKey(applicationTimestamps, buildDailyBuckets(30), (date) =>
        date.toISOString().slice(0, 10),
    );

    const allUsers = Array.isArray(usersRpc.data) ? usersRpc.data : [];
    const dailyLogins = allUsers.filter((row: any) => {
        if (!row?.last_sign_in_at) return false;
        return new Date(row.last_sign_in_at).getTime() >= dayStart.getTime();
    }).length;
    const activeUsers = allUsers.filter((row: any) => {
        if (!row?.last_sign_in_at) return false;
        return new Date(row.last_sign_in_at).getTime() >= thirtyDaysStart.getTime();
    }).length;

    return {
        totalCandidates,
        totalRecruiters,
        activeJobs,
        applicationsSubmitted,
        candidateGrowth,
        jobPostingTrends,
        applicationVolume,
        recruiterActivity: {
            jobsPosted: recruiterJobsPosted,
            applicationsReviewed: recruiterApplicationsReviewed,
            interviewsScheduled: recruiterInterviewsScheduled,
        },
        platformEngagement: {
            dailyLogins,
            activeUsers,
            messagesSent,
        },
    };
}

export function useAdminAnalytics() {
    const { user } = useAuth();

    const query = useQuery({
        queryKey: ['admin-analytics', user?.id],
        queryFn: getAdminAnalytics,
        enabled: !!user,
        staleTime: STALE_TIME,
    });

    return {
        analytics: query.data,
        isLoading: query.isLoading,
        isFetching: query.isFetching,
        error: query.error,
        refetch: query.refetch,
    };
}
