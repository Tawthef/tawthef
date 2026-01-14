import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface ApplicationWithDetails {
    id: string;
    job_id: string;
    candidate_id: string;
    status: 'applied' | 'agency_shortlisted' | 'employer_review' | 'rejected' | 'hired';
    applied_at: string;
    // Joined data
    job_title?: string;
    candidate_name?: string;
    candidate_email?: string;
}

/**
 * Hook for employers to manage applications for their jobs
 */
export function useEmployerApplications() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch applications with job and candidate details
    const query = useQuery({
        queryKey: ['employer-applications', user?.id],
        queryFn: async (): Promise<ApplicationWithDetails[]> => {
            if (!user) return [];

            // Query applications with joins
            const { data, error } = await supabase
                .from('applications')
                .select(`
          id, job_id, candidate_id, status, applied_at,
          jobs!inner(title, organization_id),
          profiles!applications_candidate_id_fkey(full_name)
        `)
                .order('applied_at', { ascending: false });

            if (error) {
                console.error('[useEmployerApplications] Error:', error);
                return [];
            }

            // Transform data
            return (data || []).map((app: any) => ({
                id: app.id,
                job_id: app.job_id,
                candidate_id: app.candidate_id,
                status: app.status,
                applied_at: app.applied_at,
                job_title: app.jobs?.title,
                candidate_name: app.profiles?.full_name || 'Unknown',
            }));
        },
        enabled: !!user,
        staleTime: 30 * 1000,
    });

    // Update application status
    const updateStatusMutation = useMutation({
        mutationFn: async ({ applicationId, status }: { applicationId: string; status: string }) => {
            const { error } = await supabase
                .from('applications')
                .update({ status })
                .eq('id', applicationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employer-applications', user?.id] });
        },
    });

    return {
        applications: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        updateStatus: updateStatusMutation.mutateAsync,
        isUpdating: updateStatusMutation.isPending,
        refetch: query.refetch,
    };
}
