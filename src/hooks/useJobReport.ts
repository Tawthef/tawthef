import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export interface JobProgressData {
    total_applications: number;
    agency_shortlisted_count: number;
    hr_shortlisted_count: number;
    technical_shortlisted_count: number;
    interview_count: number;
    offer_count: number;
    hired_count: number;
    rejected_count: number;
}

export interface JobTimelineEntry {
    application_date: string;
    count_per_day: number;
}

interface JobInfo {
    id: string;
    title: string;
    location: string | null;
    status: 'open' | 'closed' | 'draft';
    created_at: string;
    organization_id: string;
}

export interface JobReportResult {
    job: {
        id: string;
        title: string;
        location: string | null;
        status: 'open' | 'closed' | 'draft';
        posted_at: string;
        total_candidates: number;
    };
    progress: JobProgressData;
    timeline: JobTimelineEntry[];
    statusBreakdown: Array<{ status: string; count: number; color: string }>;
    funnel: Array<{ stage: string; count: number; fill: string }>;
    aiOverview: {
        totalCandidates: number;
        topTenPercentAverage: number;
        recommendedCount: number;
        recommendedApplications: Array<{
            application_id: string;
            candidate_id: string;
            current_status: string;
            score: number;
        }>;
    };
}

const STATUS_COLORS: Record<string, string> = {
    applied: 'hsl(var(--muted-foreground))',
    agency_shortlisted: 'hsl(220, 80%, 55%)',
    hr_shortlisted: 'hsl(var(--primary))',
    technical_shortlisted: 'hsl(var(--accent))',
    interview: 'hsl(var(--warning))',
    offer: 'hsl(45, 90%, 50%)',
    hired: 'hsl(var(--success))',
    rejected: 'hsl(var(--destructive))',
};

const toNumber = (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return 0;
};

const normalizeScore = (row: any) => {
    const raw = toNumber(row?.score ?? row?.overall_score);
    return Math.max(0, Math.min(100, Math.round(raw)));
};

/**
 * Hook to fetch job report data using server-side RPC functions.
 * All aggregation happens in SQL views — no frontend computation.
 */
export function useJobReport(jobId: string | undefined) {
    const { user } = useAuth();
    const { profile } = useProfile();

    const query = useQuery({
        queryKey: ['job-report', jobId, profile?.organization_id],
        queryFn: async (): Promise<JobReportResult | null> => {
            if (!jobId || !user) return null;

            // 1. Fetch job details (RLS filters by org)
            const { data: jobData, error: jobError } = await supabase
                .from('jobs')
                .select('id, title, location, status, created_at, organization_id')
                .eq('id', jobId)
                .single();

            if (jobError || !jobData) {
                console.error('[useJobReport] Error fetching job:', jobError);
                return null;
            }

            const job = jobData as JobInfo;

            // 2. Fetch aggregated progress via RPC
            const { data: progressData, error: progressError } = await supabase
                .rpc('get_job_progress', { p_job_id: jobId });

            if (progressError) {
                console.error('[useJobReport] Error fetching progress:', progressError);
                return null;
            }

            const row = Array.isArray(progressData) ? progressData[0] : progressData;
            const progress: JobProgressData = {
                total_applications: row?.total_applications ?? 0,
                agency_shortlisted_count: row?.agency_shortlisted_count ?? 0,
                hr_shortlisted_count: row?.hr_shortlisted_count ?? 0,
                technical_shortlisted_count: row?.technical_shortlisted_count ?? 0,
                interview_count: row?.interview_count ?? 0,
                offer_count: row?.offer_count ?? 0,
                hired_count: row?.hired_count ?? 0,
                rejected_count: row?.rejected_count ?? 0,
            };

            // 3. Fetch timeline via RPC
            const { data: timelineData, error: timelineError } = await supabase
                .rpc('get_job_timeline', { p_job_id: jobId });

            if (timelineError) {
                console.error('[useJobReport] Error fetching timeline:', timelineError);
            }

            const timeline: JobTimelineEntry[] = (timelineData || []).map((t: any) => ({
                application_date: t.application_date,
                count_per_day: t.count_per_day,
            }));

            // 4. Build status breakdown for bar chart
            const statusBreakdown = [
                { status: 'Applied', count: progress.total_applications, color: STATUS_COLORS.applied },
                { status: 'Agency Shortlisted', count: progress.agency_shortlisted_count, color: STATUS_COLORS.agency_shortlisted },
                { status: 'HR Shortlisted', count: progress.hr_shortlisted_count, color: STATUS_COLORS.hr_shortlisted },
                { status: 'Technical', count: progress.technical_shortlisted_count, color: STATUS_COLORS.technical_shortlisted },
                { status: 'Interview', count: progress.interview_count, color: STATUS_COLORS.interview },
                { status: 'Offer', count: progress.offer_count, color: STATUS_COLORS.offer },
                { status: 'Hired', count: progress.hired_count, color: STATUS_COLORS.hired },
                { status: 'Rejected', count: progress.rejected_count, color: STATUS_COLORS.rejected },
            ].filter(s => s.count > 0);

            // 5. Build funnel (ordered stages, excluding rejected)
            const funnel = [
                { stage: 'Applied', count: progress.total_applications, fill: STATUS_COLORS.applied },
                { stage: 'Agency Shortlisted', count: progress.agency_shortlisted_count, fill: STATUS_COLORS.agency_shortlisted },
                { stage: 'HR Shortlisted', count: progress.hr_shortlisted_count, fill: STATUS_COLORS.hr_shortlisted },
                { stage: 'Technical', count: progress.technical_shortlisted_count, fill: STATUS_COLORS.technical_shortlisted },
                { stage: 'Interview', count: progress.interview_count, fill: STATUS_COLORS.interview },
                { stage: 'Offer', count: progress.offer_count, fill: STATUS_COLORS.offer },
                { stage: 'Hired', count: progress.hired_count, fill: STATUS_COLORS.hired },
            ];

            // 6. AI match overview from existing ranking table
            const { data: scoreRows, error: scoreError } = await supabase
                .from('candidate_job_scores')
                .select('*')
                .eq('job_id', jobId);

            if (scoreError) {
                console.error('[useJobReport] Error fetching AI scores:', scoreError);
            }

            const rankedScores = (scoreRows || []).map((row: any) => ({
                candidate_id: row.candidate_id,
                score: normalizeScore(row),
            }));
            const sortedScores = [...rankedScores].sort((a, b) => b.score - a.score);
            const topTenCount = Math.max(1, Math.ceil(sortedScores.length * 0.1));
            const topTenRows = sortedScores.slice(0, topTenCount);
            const topTenPercentAverage = topTenRows.length > 0
                ? Math.round(topTenRows.reduce((sum, row) => sum + row.score, 0) / topTenRows.length)
                : 0;

            const recommendedCandidates = rankedScores.filter((row) => row.score > 75);
            const recommendedCandidateIds = recommendedCandidates.map((row) => row.candidate_id);
            let recommendedApplications: JobReportResult['aiOverview']['recommendedApplications'] = [];

            if (recommendedCandidateIds.length > 0) {
                const { data: appRows, error: appError } = await supabase
                    .from('applications')
                    .select('id, candidate_id, status')
                    .eq('job_id', jobId)
                    .in('candidate_id', recommendedCandidateIds);

                if (appError) {
                    console.error('[useJobReport] Error fetching recommended applications:', appError);
                } else {
                    const scoreByCandidateId = new Map(recommendedCandidates.map((item) => [item.candidate_id, item.score]));
                    recommendedApplications = (appRows || []).map((app: any) => ({
                        application_id: app.id,
                        candidate_id: app.candidate_id,
                        current_status: app.status,
                        score: scoreByCandidateId.get(app.candidate_id) || 0,
                    }));
                }
            }

            return {
                job: {
                    id: job.id,
                    title: job.title,
                    location: job.location,
                    status: job.status as 'open' | 'closed' | 'draft',
                    posted_at: job.created_at,
                    total_candidates: progress.total_applications,
                },
                progress,
                timeline,
                statusBreakdown,
                funnel,
                aiOverview: {
                    totalCandidates: rankedScores.length,
                    topTenPercentAverage,
                    recommendedCount: recommendedCandidates.length,
                    recommendedApplications,
                },
            };
        },
        enabled: !!jobId && !!user,
        staleTime: 5 * 60 * 1000,
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}
