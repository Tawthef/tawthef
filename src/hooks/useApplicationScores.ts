import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface ScoreBreakdown {
    skills_match: number;      // 0-40
    experience_match: number;  // 0-30
    agency_score: number;      // 0-20
    interview_score: number;   // 0-10
}

export interface ApplicationScore {
    id: string;
    application_id: string;
    score: number;
    breakdown: ScoreBreakdown;
    created_at: string;
    updated_at: string;
    // Joined data
    candidate_name?: string;
    job_title?: string;
}

interface ComputeScoreInput {
    applicationId: string;
    jobKeywords: string[];
    requiredExperience: number;
    candidateSkills: string[];
    candidateExperience: number;
    agencyConversionRate?: number;
    interviewPassed?: boolean;
}

/**
 * Compute explainable score
 */
export function computeScore(input: ComputeScoreInput): { score: number; breakdown: ScoreBreakdown } {
    const {
        jobKeywords,
        requiredExperience,
        candidateSkills,
        candidateExperience,
        agencyConversionRate = 0,
        interviewPassed,
    } = input;

    // Skills match (0-40)
    const matchedSkills = candidateSkills.filter(skill =>
        jobKeywords.some(keyword =>
            keyword.toLowerCase().includes(skill.toLowerCase()) ||
            skill.toLowerCase().includes(keyword.toLowerCase())
        )
    );
    const skillsMatch = Math.min(40, Math.round((matchedSkills.length / Math.max(jobKeywords.length, 1)) * 40));

    // Experience match (0-30)
    const expDelta = Math.abs(candidateExperience - requiredExperience);
    const experienceMatch = expDelta === 0 ? 30 : Math.max(0, 30 - expDelta * 5);

    // Agency score (0-20)
    const agencyScore = Math.min(20, Math.round(agencyConversionRate * 0.2));

    // Interview score (0-10)
    const interviewScore = interviewPassed === undefined ? 0 : interviewPassed ? 10 : 0;

    const breakdown: ScoreBreakdown = {
        skills_match: skillsMatch,
        experience_match: experienceMatch,
        agency_score: agencyScore,
        interview_score: interviewScore,
    };

    const score = skillsMatch + experienceMatch + agencyScore + interviewScore;

    return { score, breakdown };
}

/**
 * Hook for application scores
 */
export function useApplicationScores(jobId?: string) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch scores
    const query = useQuery({
        queryKey: ['application-scores', jobId || 'all', user?.id],
        queryFn: async (): Promise<ApplicationScore[]> => {
            if (!user) return [];

            let queryBuilder = supabase
                .from('application_scores')
                .select(`
          id, application_id, score, breakdown, created_at, updated_at,
          applications!inner(
            job_id,
            profiles!applications_candidate_id_fkey(full_name),
            jobs!inner(title)
          )
        `)
                .order('score', { ascending: false });

            if (jobId) {
                queryBuilder = queryBuilder.eq('applications.job_id', jobId);
            }

            const { data, error } = await queryBuilder;

            if (error) {
                console.error('[useApplicationScores] Error:', error);
                return [];
            }

            return (data || []).map((item: any) => ({
                id: item.id,
                application_id: item.application_id,
                score: item.score,
                breakdown: item.breakdown,
                created_at: item.created_at,
                updated_at: item.updated_at,
                candidate_name: item.applications?.profiles?.full_name || 'Unknown',
                job_title: item.applications?.jobs?.title,
            }));
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    });

    // Compute and store score
    const computeMutation = useMutation({
        mutationFn: async (input: ComputeScoreInput) => {
            const { score, breakdown } = computeScore(input);

            const { data: existing } = await supabase
                .from('application_scores')
                .select('id')
                .eq('application_id', input.applicationId)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase
                    .from('application_scores')
                    .update({ score, breakdown, updated_at: new Date().toISOString() })
                    .eq('application_id', input.applicationId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('application_scores')
                    .insert({ application_id: input.applicationId, score, breakdown });
                if (error) throw error;
            }

            return { score, breakdown };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['application-scores'] });
        },
    });

    return {
        scores: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        computeScore: computeMutation.mutateAsync,
        isComputing: computeMutation.isPending,
        refetch: query.refetch,
    };
}
