import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

interface Plan {
    id: string;
    name: string;
    slug: string;
    type: 'job_posting' | 'resume_access';
    price: number;
    duration_days: number;
    job_slots: number;
    features: string[];
    is_active: boolean;
}

interface Subscription {
    id: string;
    organization_id: string;
    plan_id: string;
    plan_type?: string | null;
    status: 'active' | 'expired' | 'cancelled';
    start_date: string;
    end_date: string;
    remaining_slots: number;
    usage_limit?: number | null;
    usage_used?: number | null;
    plans?: Plan | null;
}

export interface SubscriptionCheck {
    is_valid: boolean;
    remaining_days: number;
    remaining_usage: number;
}

/**
 * Hook to check a specific subscription plan via server-side RPC.
 * This is the PRIMARY enforcement hook — uses check_active_subscription RPC.
 */
export function useCheckSubscription(planType: string) {
    const { profile } = useProfile();

    const query = useQuery({
        queryKey: ['check-subscription', profile?.organization_id, planType],
        queryFn: async (): Promise<SubscriptionCheck> => {
            if (!profile?.organization_id) {
                return { is_valid: false, remaining_days: 0, remaining_usage: 0 };
            }

            const { data, error } = await supabase
                .rpc('check_active_subscription', {
                    p_org_id: profile.organization_id,
                    p_plan: planType,
                });

            if (error) {
                console.error('[useCheckSubscription] RPC Error:', error);
                return { is_valid: false, remaining_days: 0, remaining_usage: 0 };
            }

            // RPC returns an array of rows; we want the first
            const row = Array.isArray(data) ? data[0] : data;
            return {
                is_valid: row?.is_valid ?? false,
                remaining_days: row?.remaining_days ?? 0,
                remaining_usage: row?.remaining_usage ?? 0,
            };
        },
        enabled: !!profile?.organization_id && !!planType,
        staleTime: 60 * 1000, // 1 minute
    });

    return {
        check: query.data || { is_valid: false, remaining_days: 0, remaining_usage: 0 },
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}

/**
 * Hook to fetch active subscriptions for the current organization (legacy)
 */
export function useSubscription() {
    const { profile } = useProfile();

    const query = useQuery({
        queryKey: ['subscriptions', profile?.organization_id],
        queryFn: async (): Promise<Subscription[]> => {
            if (!profile?.organization_id) return [];

            const { data, error } = await supabase
                .from('subscriptions')
                .select(`
          *,
          plans(*)
        `)
                .eq('organization_id', profile.organization_id)
                .eq('status', 'active')
                .gte('end_date', new Date().toISOString())
                .order('end_date', { ascending: false });

            if (error) {
                console.error('[useSubscription] Error:', error);
                return [];
            }

            return (data || []) as Subscription[];
        },
        enabled: !!profile?.organization_id,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    return {
        subscriptions: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}

/**
 * Hook to get all available plans
 */
export function usePlans() {
    const query = useQuery({
        queryKey: ['plans'],
        queryFn: async (): Promise<Plan[]> => {
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .eq('is_active', true)
                .order('price', { ascending: true });

            if (error) {
                console.error('[usePlans] Error:', error);
                return [];
            }

            return data || [];
        },
        staleTime: 10 * 60 * 1000, // 10 minutes - plans don't change often
    });

    return {
        plans: query.data || [],
        isLoading: query.isLoading,
    };
}
