import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

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

/**
 * Hook to fetch admin dashboard data via a single RPC call.
 * Admin-only — RPC enforces role check server-side.
 */
export function useAdminDashboard() {
    const { user } = useAuth();

    const query = useQuery({
        queryKey: ['admin-dashboard'],
        queryFn: async (): Promise<AdminDashboardData | null> => {
            if (!user) return null;

            const { data, error } = await supabase.rpc('get_admin_dashboard_data');

            if (error) {
                console.error('[useAdminDashboard] Error:', error);
                throw error;
            }

            return data as AdminDashboardData;
        },
        enabled: !!user,
        staleTime: 2 * 60 * 1000, // 2 min cache
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

            if (error) {
                console.error('[useAdminDashboard] Activity error:', error);
                return [];
            }

            return (data || []) as AdminRecentActivity[];
        },
        enabled: !!user,
        staleTime: 60 * 1000,
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
        staleTime: 60 * 1000,
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
        activity: activityQuery.data || [],
        isActivityLoading: activityQuery.isLoading,
        kpis: kpiQuery.data,
        isKpisLoading: kpiQuery.isLoading,
    };
}
