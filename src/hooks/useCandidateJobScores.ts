import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface CandidateJobScore {
    id: string;
    job_id: string;
    candidate_id: string;
    score: number;
    explanation: string;
    breakdown: {
        skills_score: number;
        experience_score: number;
        keyword_score: number;
        matched_skills: string[];
        matched_keywords: string[];
    };
    created_at: string;
    updated_at: string;
    // Joined data
    candidate_name?: string;
    job_title?: string;
}

interface ComputeScoreInput {
    jobId: string;
    jobDescription: string;
    jobKeywords?: string[];
    candidateSkills: string[];
    candidateExperience: number;
    candidateKeywords: string[];
}

/**
 * Client-side score computation (fallback if DB function not available)
 */
export function computeMatchScore(input: ComputeScoreInput): {
    score: number;
    explanation: string;
    breakdown: CandidateJobScore['breakdown'];
} {
    const { jobDescription, candidateSkills, candidateExperience, candidateKeywords } = input;

    const descLower = jobDescription.toLowerCase();

    // Skills matching (0-40 points)
    const matchedSkills = candidateSkills.filter(skill =>
        descLower.includes(skill.toLowerCase())
    );
    const skillsScore = Math.min(40, matchedSkills.length * 10);

    // Experience (0-30 points)
    const experienceScore = candidateExperience >= 5 ? 30
        : candidateExperience >= 3 ? 25
            : candidateExperience >= 1 ? 15
                : 5;

    // Keywords (0-30 points)
    const matchedKeywords = candidateKeywords.filter(kw =>
        descLower.includes(kw.toLowerCase())
    );
    const keywordScore = Math.min(30, matchedKeywords.length * 10);

    const score = skillsScore + experienceScore + keywordScore;

    const explanation = `${matchedSkills.length} skills matched, ${candidateExperience} years experience, ${matchedKeywords.length} keywords aligned.`;

    return {
        score,
        explanation,
        breakdown: {
            skills_score: skillsScore,
            experience_score: experienceScore,
            keyword_score: keywordScore,
            matched_skills: matchedSkills,
            matched_keywords: matchedKeywords,
        },
    };
}

/**
 * Get score label and color based on value
 */
export function getScoreLabel(score: number): { label: string; color: string } {
    if (score >= 70) return { label: 'Excellent Match', color: 'success' };
    if (score >= 50) return { label: 'Good Match', color: 'primary' };
    if (score >= 30) return { label: 'Fair Match', color: 'warning' };
    return { label: 'Weak Match', color: 'muted' };
}

/**
 * Hook for employer: Get all candidate scores for a job
 */
export function useJobCandidateScores(jobId: string) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['job-candidate-scores', jobId, user?.id],
        queryFn: async (): Promise<CandidateJobScore[]> => {
            if (!user || !jobId) return [];

            const { data, error } = await supabase
                .from('candidate_job_scores')
                .select(`
          id, job_id, candidate_id, score, explanation, breakdown, created_at, updated_at,
          profiles!candidate_job_scores_candidate_id_fkey(full_name)
        `)
                .eq('job_id', jobId)
                .order('score', { ascending: false });

            if (error) {
                console.error('[useJobCandidateScores] Error:', error);
                return [];
            }

            return (data || []).map((item: any) => ({
                id: item.id,
                job_id: item.job_id,
                candidate_id: item.candidate_id,
                score: item.score,
                explanation: item.explanation,
                breakdown: item.breakdown,
                created_at: item.created_at,
                updated_at: item.updated_at,
                candidate_name: item.profiles?.full_name || 'Unknown',
            }));
        },
        enabled: !!user && !!jobId,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook for candidate: Get own scores for all jobs
 */
export function useCandidateScores() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['candidate-job-scores', user?.id],
        queryFn: async (): Promise<CandidateJobScore[]> => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('candidate_job_scores')
                .select(`
          id, job_id, candidate_id, score, explanation, breakdown, created_at, updated_at,
          jobs!candidate_job_scores_job_id_fkey(title)
        `)
                .eq('candidate_id', user.id)
                .order('score', { ascending: false });

            if (error) {
                console.error('[useCandidateScores] Error:', error);
                return [];
            }

            return (data || []).map((item: any) => ({
                id: item.id,
                job_id: item.job_id,
                candidate_id: item.candidate_id,
                score: item.score,
                explanation: item.explanation,
                breakdown: item.breakdown,
                created_at: item.created_at,
                updated_at: item.updated_at,
                job_title: item.jobs?.title,
            }));
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook for computing and storing a score
 */
export function useComputeScore() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (input: { jobId: string; candidateId: string }) => {
            // Try to call the DB function first
            const { data, error } = await supabase.rpc('compute_candidate_job_score', {
                p_job_id: input.jobId,
                p_candidate_id: input.candidateId,
            });

            if (error) {
                console.error('[useComputeScore] RPC error:', error);
                throw error;
            }

            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['job-candidate-scores', variables.jobId] });
            queryClient.invalidateQueries({ queryKey: ['candidate-job-scores'] });
        },
    });
}
