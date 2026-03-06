import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface CandidateJobBreakdown {
    skills_score: number;
    experience_score: number;
    keyword_score: number;
    matched_skills: string[];
    matched_keywords: string[];
    missing_skills?: string[];
}

export interface CandidateJobScore {
    id: string;
    job_id: string;
    candidate_id: string;
    score: number;
    explanation: string;
    breakdown: CandidateJobBreakdown;
    matched_skills: string[];
    missing_skills: string[];
    required_skills: string[];
    years_experience: number;
    education: string[];
    education_level: string | null;
    application_id: string | null;
    application_status: string | null;
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
    breakdown: CandidateJobBreakdown;
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
    if (score >= 80) return { label: 'Excellent Match', color: 'success' };
    if (score >= 60) return { label: 'Strong Match', color: 'primary' };
    return { label: 'Potential Match', color: 'muted' };
}

const toNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallback;
};

const toStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const normalizeScore = (row: any) => {
    const raw = toNumber(row?.score ?? row?.overall_score, 0);
    return Math.max(0, Math.min(100, Math.round(raw)));
};

const normalizeBreakdown = (row: any): CandidateJobBreakdown => {
    const breakdown = row?.breakdown || {};
    return {
        skills_score: toNumber(
            breakdown.skills_score ?? row?.skill_match_score,
            0
        ),
        experience_score: toNumber(
            breakdown.experience_score ?? row?.experience_score,
            0
        ),
        keyword_score: toNumber(
            breakdown.keyword_score ?? row?.keyword_score,
            0
        ),
        matched_skills: toStringArray(breakdown.matched_skills ?? row?.matched_skills),
        matched_keywords: toStringArray(breakdown.matched_keywords),
        missing_skills: toStringArray(breakdown.missing_skills ?? row?.missing_skills),
    };
};

const buildFallbackExplanation = (score: number, matchedSkillsCount: number, yearsExperience: number) => {
    if (score >= 80) {
        return `High alignment with the role: ${matchedSkillsCount} matched skills and ${yearsExperience} years of relevant experience.`;
    }
    if (score >= 60) {
        return `Solid fit with transferable strengths: ${matchedSkillsCount} matched skills and ${yearsExperience} years of experience.`;
    }
    return `Partial fit today: ${matchedSkillsCount} matched skills, with additional growth needed for this role.`;
};

const normalizeScoreRow = (row: any, requiredSkills: string[], profileData?: any, applicationData?: any, jobTitle?: string): CandidateJobScore => {
    const score = normalizeScore(row);
    const breakdown = normalizeBreakdown(row);
    const matchedSkills = breakdown.matched_skills;
    const missingSkills = breakdown.missing_skills?.length
        ? breakdown.missing_skills
        : requiredSkills.filter((required) =>
            !matchedSkills.some((matched) => matched.toLowerCase() === required.toLowerCase())
        );
    const yearsExperience = toNumber(profileData?.years_experience, 0);

    return {
        id: row.id,
        job_id: row.job_id,
        candidate_id: row.candidate_id,
        score,
        explanation: row.explanation
            || row.ai_explanation
            || buildFallbackExplanation(score, matchedSkills.length, yearsExperience),
        breakdown,
        matched_skills: matchedSkills,
        missing_skills: missingSkills,
        required_skills: requiredSkills,
        years_experience: yearsExperience,
        education: toStringArray(profileData?.education),
        education_level: typeof profileData?.education_level === 'string' ? profileData.education_level : null,
        application_id: applicationData?.id ?? null,
        application_status: applicationData?.status ?? null,
        created_at: row.created_at,
        updated_at: row.updated_at || profileData?.updated_at || row.created_at,
        candidate_name: row.profiles?.full_name || 'Unknown',
        job_title: jobTitle,
    };
};

/**
 * Hook for employer: Get all candidate scores for a job
 */
export function useJobCandidateScores(jobId: string) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['job-candidate-scores', jobId, user?.id],
        queryFn: async (): Promise<CandidateJobScore[]> => {
            if (!user || !jobId) return [];

            const [scoreRes, jobRes] = await Promise.all([
                supabase
                    .from('candidate_job_scores')
                    .select(`
                        *,
                        profiles!candidate_job_scores_candidate_id_fkey(full_name)
                    `)
                    .eq('job_id', jobId),
                supabase
                    .from('jobs')
                    .select('title, skills')
                    .eq('id', jobId)
                    .maybeSingle()
            ]);

            if (scoreRes.error) {
                console.error('[useJobCandidateScores] Error:', scoreRes.error);
                return [];
            }

            const scoreRows = scoreRes.data || [];
            const candidateIds = Array.from(new Set(scoreRows.map((item: any) => item.candidate_id).filter(Boolean)));
            const requiredSkills = toStringArray(jobRes.data?.skills);
            const jobTitle = jobRes.data?.title || undefined;

            let candidateProfiles: any[] = [];
            let applications: any[] = [];
            if (candidateIds.length > 0) {
                const [profileRes, appRes] = await Promise.all([
                    supabase
                        .from('candidate_profiles')
                        .select('candidate_id, years_experience, education, education_level, updated_at')
                        .in('candidate_id', candidateIds),
                    supabase
                        .from('applications')
                        .select('id, candidate_id, status')
                        .eq('job_id', jobId)
                        .in('candidate_id', candidateIds)
                ]);

                if (!profileRes.error) {
                    candidateProfiles = profileRes.data || [];
                }
                if (!appRes.error) {
                    applications = appRes.data || [];
                }
            }

            const profileByCandidateId = new Map(candidateProfiles.map((profile: any) => [profile.candidate_id, profile]));
            const appByCandidateId = new Map(applications.map((app: any) => [app.candidate_id, app]));

            return scoreRows
                .map((row: any) => normalizeScoreRow(
                    row,
                    requiredSkills,
                    profileByCandidateId.get(row.candidate_id),
                    appByCandidateId.get(row.candidate_id),
                    jobTitle
                ))
                .sort((a, b) => b.score - a.score);
        },
        enabled: !!user && !!jobId,
        staleTime: 2 * 60 * 1000,
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
                    *,
                    jobs!candidate_job_scores_job_id_fkey(title)
        `)
                .eq('candidate_id', user.id);

            if (error) {
                console.error('[useCandidateScores] Error:', error);
                return [];
            }

            return (data || [])
                .map((row: any) => normalizeScoreRow(
                    row,
                    [],
                    {
                        years_experience: 0,
                        education: [],
                        education_level: null,
                        updated_at: row.updated_at,
                    },
                    null,
                    row.jobs?.title
                ))
                .sort((a, b) => b.score - a.score);
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
