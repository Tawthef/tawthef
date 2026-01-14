import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export interface AgencyApplication {
    id: string;
    job_id: string;
    candidate_id: string;
    agency_id: string;
    submitted_by: string;
    status: 'applied' | 'agency_shortlisted' | 'employer_review' | 'rejected' | 'hired';
    applied_at: string;
    // Joined data
    job_title?: string;
    candidate_name?: string;
    organization_name?: string;
}

/**
 * Hook for agencies to manage their candidate submissions
 */
export function useAgencyApplications() {
    const { user } = useAuth();
    const { profile } = useProfile();
    const queryClient = useQueryClient();

    // Fetch agency's submissions with job and candidate details
    const query = useQuery({
        queryKey: ['agency-applications', profile?.organization_id],
        queryFn: async (): Promise<AgencyApplication[]> => {
            if (!user || !profile?.organization_id) return [];

            const { data, error } = await supabase
                .from('applications')
                .select(`
          id, job_id, candidate_id, agency_id, submitted_by, status, applied_at,
          jobs!inner(title, organization_id, organizations!inner(name)),
          profiles!applications_candidate_id_fkey(full_name)
        `)
                .eq('agency_id', profile.organization_id)
                .order('applied_at', { ascending: false });

            if (error) {
                console.error('[useAgencyApplications] Error:', error);
                return [];
            }

            return (data || []).map((app: any) => ({
                id: app.id,
                job_id: app.job_id,
                candidate_id: app.candidate_id,
                agency_id: app.agency_id,
                submitted_by: app.submitted_by,
                status: app.status,
                applied_at: app.applied_at,
                job_title: app.jobs?.title,
                candidate_name: app.profiles?.full_name || 'Unknown',
                organization_name: app.jobs?.organizations?.name,
            }));
        },
        enabled: !!user && !!profile?.organization_id && profile?.role === 'agency',
        staleTime: 30 * 1000,
    });

    // Submit a candidate to a job
    const submitMutation = useMutation({
        mutationFn: async ({ jobId, candidateId }: { jobId: string; candidateId: string }) => {
            if (!user || !profile?.organization_id) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('applications')
                .insert({
                    job_id: jobId,
                    candidate_id: candidateId,
                    agency_id: profile.organization_id,
                    submitted_by: user.id,
                    status: 'applied', // Start as applied, agency will shortlist
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    throw new Error('Candidate already submitted for this job');
                }
                throw error;
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agency-applications', profile?.organization_id] });
        },
    });

    // Shortlist a submission (agency approves for employer view)
    const shortlistMutation = useMutation({
        mutationFn: async (applicationId: string) => {
            const { error } = await supabase
                .from('applications')
                .update({ status: 'agency_shortlisted' })
                .eq('id', applicationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agency-applications', profile?.organization_id] });
        },
    });

    return {
        applications: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        submitCandidate: submitMutation.mutateAsync,
        isSubmitting: submitMutation.isPending,
        shortlist: shortlistMutation.mutateAsync,
        isShortlisting: shortlistMutation.isPending,
        refetch: query.refetch,
    };
}
