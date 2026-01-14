import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export interface Interview {
    id: string;
    application_id: string;
    round: 'hr' | 'technical' | 'managerial' | 'final';
    scheduled_at: string;
    interviewer_id: string | null;
    status: 'scheduled' | 'completed' | 'cancelled';
    feedback: string | null;
    created_at: string;
    // Joined data
    candidate_name?: string;
    job_title?: string;
    interviewer_name?: string;
}

interface ScheduleInterviewInput {
    applicationId: string;
    round: 'hr' | 'technical' | 'managerial' | 'final';
    scheduledAt: string;
    interviewerId?: string;
}

interface SubmitFeedbackInput {
    interviewId: string;
    feedback: string;
    status: 'completed' | 'cancelled';
}

/**
 * Hook for managing interviews across roles
 */
export function useInterviews(applicationId?: string) {
    const { user } = useAuth();
    const { profile } = useProfile();
    const queryClient = useQueryClient();

    // Fetch interviews (filtered by applicationId if provided, otherwise all visible)
    const query = useQuery({
        queryKey: ['interviews', applicationId || 'all', user?.id],
        queryFn: async (): Promise<Interview[]> => {
            if (!user) return [];

            let queryBuilder = supabase
                .from('interviews')
                .select(`
          id, application_id, round, scheduled_at, interviewer_id, status, feedback, created_at,
          applications!inner(
            candidate_id,
            profiles!applications_candidate_id_fkey(full_name),
            jobs!inner(title)
          )
        `)
                .order('scheduled_at', { ascending: true });

            if (applicationId) {
                queryBuilder = queryBuilder.eq('application_id', applicationId);
            }

            const { data, error } = await queryBuilder;

            if (error) {
                console.error('[useInterviews] Error:', error);
                return [];
            }

            return (data || []).map((interview: any) => ({
                id: interview.id,
                application_id: interview.application_id,
                round: interview.round,
                scheduled_at: interview.scheduled_at,
                interviewer_id: interview.interviewer_id,
                status: interview.status,
                feedback: interview.feedback,
                created_at: interview.created_at,
                candidate_name: interview.applications?.profiles?.full_name || 'Unknown',
                job_title: interview.applications?.jobs?.title,
            }));
        },
        enabled: !!user,
        staleTime: 30 * 1000,
    });

    // Schedule a new interview (Employer)
    const scheduleMutation = useMutation({
        mutationFn: async (input: ScheduleInterviewInput) => {
            const { data, error } = await supabase
                .from('interviews')
                .insert({
                    application_id: input.applicationId,
                    round: input.round,
                    scheduled_at: input.scheduledAt,
                    interviewer_id: input.interviewerId || null,
                    status: 'scheduled',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interviews'] });
        },
    });

    // Submit feedback (Interviewer)
    const submitFeedbackMutation = useMutation({
        mutationFn: async (input: SubmitFeedbackInput) => {
            const { error } = await supabase
                .from('interviews')
                .update({
                    feedback: input.feedback,
                    status: input.status,
                })
                .eq('id', input.interviewId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interviews'] });
        },
    });

    // Cancel interview (Employer)
    const cancelMutation = useMutation({
        mutationFn: async (interviewId: string) => {
            const { error } = await supabase
                .from('interviews')
                .update({ status: 'cancelled' })
                .eq('id', interviewId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interviews'] });
        },
    });

    return {
        interviews: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        scheduleInterview: scheduleMutation.mutateAsync,
        isScheduling: scheduleMutation.isPending,
        submitFeedback: submitFeedbackMutation.mutateAsync,
        isSubmittingFeedback: submitFeedbackMutation.isPending,
        cancelInterview: cancelMutation.mutateAsync,
        isCancelling: cancelMutation.isPending,
        refetch: query.refetch,
    };
}
