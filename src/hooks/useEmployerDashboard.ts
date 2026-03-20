import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

export interface EmployerDashboardStats {
    activeJobs: number;
    totalApplicants: number;
    shortlisted: number;
    inInterview: number;
    offersSent: number;
    hired: number;
    rejected: number;
    subscriptionPlan: string | null;
    subscriptionActive: boolean;
    jobSlotsUsed: number;
    jobSlotsLimit: number;
}

export interface EmployerRecentActivity {
    id: string;
    action_type: string;
    description: string;
    created_at: string;
}

export interface EmployerTopAiMatch {
    candidateId: string;
    jobId: string;
    candidateName: string;
    jobTitle: string;
    score: number;
    updatedAt: string;
}

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

export function useEmployerDashboard() {
    const { profile } = useProfile();
    const orgId = profile?.organization_id;
    const queryClient = useQueryClient();

    const statsQuery = useQuery({
        queryKey: ['employer-dashboard-stats', orgId],
        queryFn: async (): Promise<EmployerDashboardStats> => {
            if (!orgId) {
                return {
                    activeJobs: 0,
                    totalApplicants: 0,
                    shortlisted: 0,
                    inInterview: 0,
                    offersSent: 0,
                    hired: 0,
                    rejected: 0,
                    subscriptionPlan: null,
                    subscriptionActive: false,
                    jobSlotsUsed: 0,
                    jobSlotsLimit: 0,
                };
            }

            const { data: jobRows, error: jobsError } = await supabase
                .from('jobs')
                .select('id, status')
                .eq('organization_id', orgId);
            if (jobsError) throw jobsError;

            const jobs = jobRows || [];
            const jobIds = jobs.map((job: any) => job.id).filter(Boolean);
            const activeJobs = jobs.filter((job: any) => ['active', 'open'].includes(job.status)).length;

            let totalApplicants = 0;
            let shortlisted = 0;
            let inInterview = 0;
            let offersSent = 0;
            let hired = 0;
            let rejected = 0;

            if (jobIds.length > 0) {
                const { data: appRows, error: appsError } = await supabase
                    .from('applications')
                    .select('id, status')
                    .in('job_id', jobIds);
                if (appsError) throw appsError;

                const apps = appRows || [];
                const appIds = apps.map((app: any) => app.id).filter(Boolean);

                totalApplicants = apps.length;
                shortlisted = apps.filter((app: any) =>
                    ['agency_shortlisted', 'hr_shortlisted', 'technical_shortlisted'].includes(app.status),
                ).length;
                offersSent = apps.filter((app: any) => ['offer', 'offer_sent', 'offered'].includes(app.status)).length;
                hired = apps.filter((app: any) => app.status === 'hired').length;
                rejected = apps.filter((app: any) => app.status === 'rejected').length;

                if (appIds.length > 0) {
                    const { count: interviewsCount, error: interviewsError } = await supabase
                        .from('interviews')
                        .select('*', { count: 'exact', head: true })
                        .in('application_id', appIds)
                        .eq('status', 'scheduled');
                    if (interviewsError) throw interviewsError;
                    inInterview = Number(interviewsCount || 0);
                }
            }

            const { data: sub, error: subError } = await supabase
                .from('subscriptions')
                .select('plan_type, is_active, usage_used, usage_limit, end_date')
                .eq('organization_id', orgId)
                .eq('is_active', true)
                .gte('end_date', new Date().toISOString())
                .in('plan_type', ['job_slot_basic', 'job_slot_pro', 'job_slot_invite', 'full_access'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (subError) throw subError;

            return {
                activeJobs,
                totalApplicants,
                shortlisted,
                inInterview,
                offersSent,
                hired,
                rejected,
                subscriptionPlan: sub?.plan_type || null,
                subscriptionActive: !!sub,
                jobSlotsUsed: sub?.usage_used || 0,
                jobSlotsLimit: sub?.usage_limit || 0,
            };
        },
        enabled: !!orgId,
        staleTime: 60000,
    });

    const activityQuery = useQuery({
        queryKey: ['employer-recent-activity', orgId],
        queryFn: async (): Promise<EmployerRecentActivity[]> => {
            if (!orgId) return [];

            const { data, error } = await supabase
                .from('activity_logs')
                .select('id, action_type, description, created_at')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;

            return (data || []) as EmployerRecentActivity[];
        },
        enabled: !!orgId,
        staleTime: 60000,
    });

    const topAiMatchesQuery = useQuery({
        queryKey: ['employer-top-ai-matches', orgId],
        queryFn: async (): Promise<EmployerTopAiMatch[]> => {
            if (!orgId) return [];

            const { data: jobs, error: jobsError } = await supabase
                .from('jobs')
                .select('id, title')
                .eq('organization_id', orgId);
            if (jobsError) throw jobsError;
            if (!jobs || jobs.length === 0) return [];

            const jobIds = jobs.map((job: any) => job.id);
            const jobTitleById = new Map(jobs.map((job: any) => [job.id, job.title || 'Untitled Job']));

            const { data: scoreRows, error: scoreError } = await supabase
                .from('candidate_job_scores')
                .select('*')
                .in('job_id', jobIds)
                .order('updated_at', { ascending: false })
                .limit(300);
            if (scoreError) throw scoreError;
            if (!scoreRows || scoreRows.length === 0) return [];

            const candidateIds = Array.from(
                new Set(scoreRows.map((row: any) => row.candidate_id).filter(Boolean)),
            ) as string[];

            let profileRows: any[] = [];
            if (candidateIds.length > 0) {
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .in('id', candidateIds);
                if (profilesError) throw profilesError;
                profileRows = profiles || [];
            }

            const nameById = new Map(
                profileRows.map((profile: any) => [profile.id, profile.full_name || 'Candidate']),
            );

            return scoreRows
                .map((row: any) => ({
                    candidateId: row.candidate_id,
                    jobId: row.job_id,
                    candidateName: nameById.get(row.candidate_id) || 'Candidate',
                    jobTitle: jobTitleById.get(row.job_id) || 'Untitled Job',
                    score: normalizeScore(row),
                    updatedAt: row.updated_at || row.created_at,
                }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 5);
        },
        enabled: !!orgId,
        staleTime: 60000,
    });

    useEffect(() => {
        if (!orgId) return;

        const invalidate = () => {
            queryClient.invalidateQueries({ queryKey: ['employer-dashboard-stats', orgId] });
            queryClient.invalidateQueries({ queryKey: ['employer-recent-activity', orgId] });
            queryClient.invalidateQueries({ queryKey: ['employer-top-ai-matches', orgId] });
        };

        const channel = supabase
            .channel(`employer-dashboard-${orgId}-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `organization_id=eq.${orgId}` }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `organization_id=eq.${orgId}` }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs', filter: `organization_id=eq.${orgId}` }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'candidate_job_scores' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, invalidate)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orgId, queryClient]);

    return {
        stats: statsQuery.data,
        isLoading: statsQuery.isLoading,
        error: statsQuery.error,
        activity: activityQuery.data || [],
        isActivityLoading: activityQuery.isLoading,
        activityError: activityQuery.error,
        topAiMatches: topAiMatchesQuery.data || [],
        isTopAiMatchesLoading: topAiMatchesQuery.isLoading,
        topAiMatchesError: topAiMatchesQuery.error,
    };
}
