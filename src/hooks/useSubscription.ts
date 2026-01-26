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
    status: 'active' | 'expired' | 'cancelled';
    start_date: string;
    end_date: string;
    remaining_slots: number;
    plans: Plan;
}

/**
 * Hook to fetch active subscriptions for the current organization
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
