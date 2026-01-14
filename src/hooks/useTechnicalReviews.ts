import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface TechnicalReviewApplication {
    id: string;
    job_id: string;
    candidate_id: string;
    status: string;
    technical_status: 'pending' | 'approved' | 'rejected' | null;
    technical_score: number | null;
    technical_feedback: string | null;
    applied_at: string;
    // Joined data
    job_title?: string;
    candidate_name?: string;
    organization_name?: string;
}

/**
 * Hook for technical reviewers to manage their assigned reviews
 */
export function useTechnicalReviews() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch applications assigned to this reviewer
    const query = useQuery({
        queryKey: ['technical-reviews', user?.id],
        queryFn: async (): Promise<TechnicalReviewApplication[]> => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('applications')
                .select(`
          id, job_id, candidate_id, status, technical_status, technical_score, technical_feedback, applied_at,
          jobs!inner(title, organizations!inner(name)),
          profiles!applications_candidate_id_fkey(full_name)
        `)
                .eq('technical_reviewer_id', user.id)
                .order('applied_at', { ascending: false });

            if (error) {
                console.error('[useTechnicalReviews] Error:', error);
                return [];
            }

            return (data || []).map((app: any) => ({
                id: app.id,
                job_id: app.job_id,
                candidate_id: app.candidate_id,
                status: app.status,
                technical_status: app.technical_status,
                technical_score: app.technical_score,
                technical_feedback: app.technical_feedback,
                applied_at: app.applied_at,
                job_title: app.jobs?.title,
                candidate_name: app.profiles?.full_name || 'Unknown',
                organization_name: app.jobs?.organizations?.name,
            }));
        },
        enabled: !!user,
        staleTime: 30 * 1000,
    });

    // Submit technical review
    const submitReviewMutation = useMutation({
        mutationFn: async ({
            applicationId,
            score,
            feedback,
            decision,
        }: {
            applicationId: string;
            score: number;
            feedback: string;
            decision: 'approved' | 'rejected';
        }) => {
            const { error } = await supabase
                .from('applications')
                .update({
                    technical_status: decision,
                    technical_score: score,
                    technical_feedback: feedback,
                })
                .eq('id', applicationId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['technical-reviews', user?.id] });
        },
    });

    return {
        reviews: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        submitReview: submitReviewMutation.mutateAsync,
        isSubmitting: submitReviewMutation.isPending,
        refetch: query.refetch,
    };
}
