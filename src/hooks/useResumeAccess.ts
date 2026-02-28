import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

/**
 * Hook to check resume search access via server-side RPC.
 * Calls has_resume_access() which enforces expiry and validity server-side.
 */
export function useResumeAccess() {
    const { profile } = useProfile();

    const query = useQuery({
        queryKey: ['resume-access-rpc', profile?.organization_id],
        queryFn: async (): Promise<boolean> => {
            if (!profile?.organization_id) return false;

            const { data, error } = await supabase
                .rpc('has_resume_access', {
                    p_org_id: profile.organization_id,
                });

            if (error) {
                console.error('[useResumeAccess] RPC Error:', error);
                return false;
            }

            return !!data;
        },
        enabled: !!profile?.organization_id,
        staleTime: 60 * 1000, // 1 minute
    });

    return {
        hasResumeAccess: query.data ?? false,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}
