import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';

// ─── Types ──────────────────────────────────────────────────────
export interface ScoreBreakdown {
    skills_match: number;
    experience_match: number;
    agency_score: number;
    interview_score: number;
}

export interface RichCandidateScore {
    id: string;
    application_id: string;
    candidate_id: string;
    job_id: string;
    // Overall AI match score (0-100)
    score: number;
    // Sub-scores
    skill_score: number;       // 0-100 percentage
    experience_score: number;  // 0-100 percentage
    keyword_score: number;     // 0-100 percentage
    title_score: number;
    location_score: number;
    freshness_score: number;
    // Skill analysis
    matched_skills: string[];
    missing_skills: string[];
    // AI insight
    ai_explanation: string | null;
    // Candidate info
    candidate_name: string;
    candidate_email?: string;
    years_experience: number;
    job_titles: string[];
    // Job info
    job_title: string;
    job_id_ref: string;
    // Timestamps
    created_at: string;
    // Legacy breakdown for ScoreBreakdownCard compatibility
    breakdown: ScoreBreakdown;
    // Status
    status: string;
}

export interface TopMatchAcrossJobs {
    candidate_name: string;
    job_title: string;
    score: number;
    matched_skills: string[];
    job_id: string;
    application_id: string;
}

// ─── Main hook ──────────────────────────────────────────────────
export function useRichCandidateScores(jobId?: string) {
    const { user } = useAuth();
    const { profile } = useProfile();
    const orgId = profile?.organization_id;

    return useQuery({
        queryKey: ['rich-candidate-scores', jobId || 'all', orgId],
        queryFn: async (): Promise<RichCandidateScore[]> => {
            if (!user || !orgId) return [];

            // Base query from candidate_job_scores (from cv_parsing_schema.sql)
            let q = supabase
                .from('candidate_job_scores')
                .select(`
                    id,
                    job_id,
                    candidate_id,
                    overall_score,
                    skill_score,
                    experience_score,
                    keyword_score,
                    title_score,
                    location_score,
                    freshness_score,
                    matched_skills,
                    missing_skills,
                    ai_explanation,
                    created_at,
                    jobs!inner(
                        title,
                        organization_id
                    ),
                    applications!inner(
                        id,
                        status,
                        candidate_id,
                        profiles!applications_candidate_id_fkey(
                            full_name,
                            id
                        ),
                        candidate_profiles!inner(
                            years_experience,
                            job_titles
                        )
                    )
                `)
                .eq('jobs.organization_id', orgId)
                .order('overall_score', { ascending: false });

            if (jobId) {
                q = q.eq('job_id', jobId);
            }

            const { data, error } = await q;

            if (error) {
                // Fallback to older application_scores table if candidate_job_scores doesn't exist
                const { data: fallback, error: fallbackErr } = await supabase
                    .from('application_scores')
                    .select(`
                        id, application_id, score, breakdown, created_at,
                        applications!inner(
                            job_id,
                            status,
                            profiles!applications_candidate_id_fkey(full_name),
                            jobs!inner(title, organization_id)
                        )
                    `)
                    .order('score', { ascending: false });

                if (fallbackErr || !fallback) return [];

                return (fallback as any[])
                    .filter(item => item.applications?.jobs?.organization_id === orgId)
                    .filter(item => !jobId || item.applications?.job_id === jobId)
                    .map(item => ({
                        id: item.id,
                        application_id: item.application_id,
                        candidate_id: '',
                        job_id: item.applications?.job_id || '',
                        score: item.score,
                        skill_score: item.breakdown?.skills_match ?? 0,
                        experience_score: item.breakdown?.experience_match ?? 0,
                        keyword_score: 0,
                        title_score: 0,
                        location_score: 0,
                        freshness_score: 0,
                        matched_skills: [],
                        missing_skills: [],
                        ai_explanation: null,
                        candidate_name: item.applications?.profiles?.full_name || 'Unknown',
                        years_experience: 0,
                        job_titles: [],
                        job_title: item.applications?.jobs?.title || '',
                        job_id_ref: item.applications?.job_id || '',
                        created_at: item.created_at,
                        status: item.applications?.status || 'applied',
                        breakdown: item.breakdown || { skills_match: 0, experience_match: 0, agency_score: 0, interview_score: 0 },
                    }));
            }

            return (data as any[]).map(item => {
                const score = item.overall_score ?? 0;
                return {
                    id: item.id,
                    application_id: item.applications?.id || '',
                    candidate_id: item.candidate_id,
                    job_id: item.job_id,
                    score,
                    skill_score: item.skill_score ?? 0,
                    experience_score: item.experience_score ?? 0,
                    keyword_score: item.keyword_score ?? 0,
                    title_score: item.title_score ?? 0,
                    location_score: item.location_score ?? 0,
                    freshness_score: item.freshness_score ?? 0,
                    matched_skills: item.matched_skills || [],
                    missing_skills: item.missing_skills || [],
                    ai_explanation: item.ai_explanation || null,
                    candidate_name: item.applications?.profiles?.full_name || 'Unknown',
                    years_experience: item.applications?.candidate_profiles?.years_experience ?? 0,
                    job_titles: item.applications?.candidate_profiles?.job_titles || [],
                    job_title: item.jobs?.title || '',
                    job_id_ref: item.job_id,
                    created_at: item.created_at,
                    status: item.applications?.status || 'applied',
                    breakdown: {
                        skills_match: Math.round((item.skill_score ?? 0) * 0.4),
                        experience_match: Math.round((item.experience_score ?? 0) * 0.3),
                        agency_score: Math.round((item.keyword_score ?? 0) * 0.2),
                        interview_score: Math.round((item.freshness_score ?? 0) * 0.1),
                    },
                };
            });
        },
        enabled: !!user && !!orgId,
        staleTime: 3 * 60 * 1000,
    });
}

// ─── Top matches across all jobs (for dashboard widget) ─────────
export function useTopMatchesAcrossJobs(limit = 5) {
    const { user } = useAuth();
    const { profile } = useProfile();
    const orgId = profile?.organization_id;

    return useQuery({
        queryKey: ['top-matches-all-jobs', orgId, limit],
        queryFn: async (): Promise<TopMatchAcrossJobs[]> => {
            if (!user || !orgId) return [];

            const { data, error } = await supabase
                .from('candidate_job_scores')
                .select(`
                    overall_score,
                    matched_skills,
                    job_id,
                    jobs!inner(title, organization_id),
                    applications!inner(
                        id,
                        profiles!applications_candidate_id_fkey(full_name)
                    )
                `)
                .eq('jobs.organization_id', orgId)
                .order('overall_score', { ascending: false })
                .limit(limit);

            if (error || !data) return [];

            return (data as any[]).map(item => ({
                candidate_name: item.applications?.profiles?.full_name || 'Unknown',
                job_title: item.jobs?.title || '',
                score: item.overall_score ?? 0,
                matched_skills: item.matched_skills || [],
                job_id: item.job_id,
                application_id: item.applications?.id || '',
            }));
        },
        enabled: !!user && !!orgId,
        staleTime: 5 * 60 * 1000,
    });
}

// Keep legacy export for backwards compat
export function useApplicationScores(jobId?: string) {
    const result = useRichCandidateScores(jobId);
    return {
        scores: (result.data || []).map(s => ({
            ...s,
            breakdown: s.breakdown,
        })),
        isLoading: result.isLoading,
        error: result.error,
        computeScore: async () => { },
        isComputing: false,
        refetch: result.refetch,
    };
}

// Legacy computeScore helper kept for any callers
export function computeScore(input: any) { return { score: 0, breakdown: { skills_match: 0, experience_match: 0, agency_score: 0, interview_score: 0 } }; }
