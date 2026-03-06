import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export type InterviewRound = 'hr' | 'technical' | 'managerial' | 'final' | string;
export type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | string;
export type CandidateResponse = 'pending' | 'accepted' | 'declined' | null;

export interface Interview {
    id: string;
    application_id: string;
    round: InterviewRound;
    scheduled_at: string;
    interviewer_id: string | null;
    status: InterviewStatus;
    candidate_response: CandidateResponse;
    meeting_link: string | null;
    feedback: string | null;
    created_at: string;
    // Joined data
    candidate_id?: string;
    candidate_name?: string;
    job_title?: string;
}

interface ScheduleInterviewInput {
    applicationId: string;
    round: InterviewRound;
    scheduledAt: string;
    interviewerId: string;
    meetingLink?: string;
}

interface RespondToInterviewInput {
    interviewId: string;
    response: 'accepted' | 'declined';
}

export interface InterviewSchedulingApplication {
    id: string;
    candidate_id: string;
    candidate_name: string;
    job_title: string;
    status: string;
}

export interface InterviewerOption {
    id: string;
    full_name: string;
    role: string;
}

/**
 * Hook for managing interviews across roles
 */
export function useInterviews() {
    const { user } = useAuth();
    const { profile } = useProfile();
    const queryClient = useQueryClient();
    const isRecruiterRole = profile?.role === 'employer' || profile?.role === 'agency' || profile?.role === 'admin';

    const normalizeCandidateResponse = (value: string | null): CandidateResponse => {
        if (value === 'accepted' || value === 'declined' || value === 'pending') return value;
        return 'pending';
    };

    // Fetch interviews visible to the current user
    const interviewsQuery = useQuery({
        queryKey: ['interviews', user?.id, profile?.role],
        queryFn: async (): Promise<Interview[]> => {
            if (!user) return [];

            let queryBuilder = supabase
                .from('interviews')
                .select(`
          id, application_id, round, scheduled_at, interviewer_id, status, candidate_response, meeting_link, feedback, created_at,
          applications!inner(
            id, candidate_id,
            profiles!applications_candidate_id_fkey(full_name),
            jobs!inner(title)
          )
        `)
                .order('scheduled_at', { ascending: true });

            if (profile?.role === 'candidate') {
                queryBuilder = queryBuilder.eq('applications.candidate_id', user.id);
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
                candidate_response: normalizeCandidateResponse(interview.candidate_response),
                meeting_link: interview.meeting_link || null,
                feedback: interview.feedback,
                created_at: interview.created_at,
                candidate_id: interview.applications?.candidate_id,
                candidate_name: interview.applications?.profiles?.full_name || 'Unknown',
                job_title: interview.applications?.jobs?.title,
            }));
        },
        enabled: !!user,
        staleTime: 30 * 1000,
    });

    // Recruiter scheduling options (applications + interviewers)
    const applicationOptionsQuery = useQuery({
        queryKey: ['interviews', 'application-options', user?.id, profile?.organization_id],
        queryFn: async (): Promise<InterviewSchedulingApplication[]> => {
            if (!user || !profile) return [];

            let queryBuilder = supabase
                .from('applications')
                .select(`
          id, candidate_id, status, applied_at,
          jobs!inner(title, organization_id),
          profiles!applications_candidate_id_fkey(full_name)
        `)
                .order('applied_at', { ascending: false });

            if (profile.role !== 'admin' && profile.organization_id) {
                queryBuilder = queryBuilder.eq('jobs.organization_id', profile.organization_id);
            }

            const { data, error } = await queryBuilder;

            if (error) {
                console.error('[useInterviews] Application options error:', error);
                return [];
            }

            return (data || [])
                .filter((application: any) => !['hired', 'rejected'].includes(application.status))
                .map((application: any) => ({
                    id: application.id,
                    candidate_id: application.candidate_id,
                    candidate_name: application.profiles?.full_name || 'Unknown',
                    job_title: application.jobs?.title || 'Unknown role',
                    status: application.status,
                }));
        },
        enabled: !!user && !!profile && isRecruiterRole,
        staleTime: 60 * 1000,
    });

    const interviewerOptionsQuery = useQuery({
        queryKey: ['interviews', 'interviewer-options', user?.id, profile?.organization_id],
        queryFn: async (): Promise<InterviewerOption[]> => {
            if (!user || !profile) return [];

            let queryBuilder = supabase
                .from('profiles')
                .select('id, full_name, role, organization_id')
                .in('role', ['employer', 'agency', 'admin', 'expert']);

            if (profile.organization_id) {
                queryBuilder = queryBuilder.eq('organization_id', profile.organization_id);
            }

            const { data, error } = await queryBuilder.order('full_name', { ascending: true });

            if (error) {
                console.error('[useInterviews] Interviewer options error:', error);
                return [{
                    id: user.id,
                    full_name: profile.full_name || 'You',
                    role: profile.role,
                }];
            }

            const options = ((data || []) as any[]).map((interviewer) => ({
                id: interviewer.id,
                full_name: interviewer.full_name || 'Unnamed interviewer',
                role: interviewer.role,
            }));

            if (!options.some((item) => item.id === user.id)) {
                options.unshift({
                    id: user.id,
                    full_name: profile.full_name || 'You',
                    role: profile.role,
                });
            }

            return options;
        },
        enabled: !!user && !!profile && isRecruiterRole,
        staleTime: 60 * 1000,
    });

    // Schedule a new interview (Employer)
    const scheduleMutation = useMutation({
        mutationFn: async (input: ScheduleInterviewInput) => {
            const { data, error } = await supabase
                .rpc('schedule_interview', {
                    p_application_id: input.applicationId,
                    p_round: input.round,
                    p_scheduled_at: input.scheduledAt,
                    p_interviewer_id: input.interviewerId,
                    p_meeting_link: input.meetingLink || null,
                })

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interviews'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['candidate-timeline'] });
        },
    });

    const respondMutation = useMutation({
        mutationFn: async (input: RespondToInterviewInput) => {
            const { error } = await supabase
                .rpc('respond_to_interview', {
                    p_interview_id: input.interviewId,
                    p_response: input.response,
                });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interviews'] });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            queryClient.invalidateQueries({ queryKey: ['candidate-timeline'] });
        },
    });

    return {
        interviews: interviewsQuery.data || [],
        isLoading: interviewsQuery.isLoading,
        error: interviewsQuery.error,
        applicationOptions: applicationOptionsQuery.data || [],
        interviewerOptions: interviewerOptionsQuery.data || [],
        isLoadingApplicationOptions: applicationOptionsQuery.isLoading,
        isLoadingInterviewerOptions: interviewerOptionsQuery.isLoading,
        scheduleInterview: scheduleMutation.mutateAsync,
        isScheduling: scheduleMutation.isPending,
        respondToInterview: respondMutation.mutateAsync,
        isResponding: respondMutation.isPending,
        refetch: interviewsQuery.refetch,
    };
}
