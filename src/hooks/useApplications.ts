import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface Application {
    id: string;
    job_id: string;
    candidate_id: string;
    agency_id: string | null;
    status: 'applied' | 'agency_shortlisted' | 'employer_review' | 'rejected' | 'hired';
    applied_at: string;
}

/**
 * Hook to fetch user's applications and apply to jobs
 */
export function useApplications() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch user's applications
    const query = useQuery({
        queryKey: ['applications', user?.id],
        queryFn: async (): Promise<Application[]> => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('applications')
                .select('*')
                .order('applied_at', { ascending: false });

            if (error) {
                console.error('[useApplications] Error:', error);
                return [];
            }
            return data as Application[];
        },
        enabled: !!user,
        staleTime: 60 * 1000, // Cache for 1 minute
    });

    // Apply to a job
    const applyMutation = useMutation({
        mutationFn: async (jobId: string) => {
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('applications')
                .insert({ job_id: jobId, candidate_id: user.id })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    throw new Error('Already applied to this job');
                }
                throw error;
            }
            return data;
        },
        onSuccess: () => {
            // Invalidate applications cache
            queryClient.invalidateQueries({ queryKey: ['applications', user?.id] });
        },
    });

    // Check if user has applied to a specific job
    const hasApplied = (jobId: string): boolean => {
        return query.data?.some(app => app.job_id === jobId) || false;
    };

    return {
        applications: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        apply: applyMutation.mutateAsync,
        isApplying: applyMutation.isPending,
        applyError: applyMutation.error,
        hasApplied,
        refetch: query.refetch,
    };
}
