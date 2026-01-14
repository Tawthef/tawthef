import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface Job {
    id: string;
    title: string;
    description: string | null;
    status: 'open' | 'closed' | 'draft';
    created_at: string;
    organization_id: string;
    organization_name?: string;
    organization_type?: string;
}

/**
 * Hook to fetch jobs visible to the current user
 * RLS automatically filters based on user role
 */
export function useJobs() {
    const { user } = useAuth();

    const query = useQuery({
        queryKey: ['jobs', user?.id],
        queryFn: async (): Promise<Job[]> => {
            if (!user) return [];

            // Try jobs_with_org view first, fall back to jobs table
            const { data, error } = await supabase
                .from('jobs_with_org')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // Fallback to jobs table if view doesn't exist
                console.warn('[useJobs] View not found, using jobs table:', error.message);
                const { data: jobsData, error: jobsError } = await supabase
                    .from('jobs')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (jobsError) {
                    console.error('[useJobs] Error fetching jobs:', jobsError);
                    return [];
                }
                return jobsData as Job[];
            }

            return data as Job[];
        },
        enabled: !!user,
        staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    });

    return {
        jobs: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}
