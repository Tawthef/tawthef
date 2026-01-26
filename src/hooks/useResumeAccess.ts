import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

interface ResumeAccess {
    id: string;
    organization_id: string;
    subscription_id: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
}

/**
 * Hook to check resume search access
 */
export function useResumeAccess() {
    const { profile } = useProfile();

    const query = useQuery({
        queryKey: ['resume-access', profile?.organization_id],
        queryFn: async (): Promise<ResumeAccess | null> => {
            if (!profile?.organization_id) return null;

            const { data, error } = await supabase
                .from('resume_access')
                .select('*')
                .eq('organization_id', profile.organization_id)
                .eq('is_active', true)
                .gte('end_date', new Date().toISOString())
                .order('end_date', { ascending: false })
                .limit(1)
                .single();

            if (error) {
                // No access found is not an error
                if (error.code === 'PGRST116') return null;
                console.error('[useResumeAccess] Error:', error);
                return null;
            }

            return data;
        },
        enabled: !!profile?.organization_id,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    return {
        hasResumeAccess: !!query.data,
        expiresAt: query.data?.end_date,
        isLoading: query.isLoading,
        resumeAccess: query.data,
    };
}
