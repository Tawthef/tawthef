import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

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

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}
