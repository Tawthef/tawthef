import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

const STALE_TIME = 60000;

export interface AgencyDashboardStats {
    totalJobs: number;
    candidatesSubmitted: number;
    agencyShortlisted: number;
    hrShortlisted: number;
    inInterview: number;
    hired: number;
    rejected: number;
}

export interface AgencyRecentSubmission {
    id: string;
    candidateName: string;
    jobTitle: string;
    status: string;
    appliedAt: string;
}

export interface AgencyRecentActivity {
    id: string;
    action_type: string;
    description: string;
    created_at: string;
}

export function useAgencyDashboard() {
    const { profile } = useProfile();
    const orgId = profile?.organization_id;
    const queryClient = useQueryClient();

    const statsQuery = useQuery({
        queryKey: ['agency-dashboard-stats', orgId],
        queryFn: async (): Promise<AgencyDashboardStats> => {
            if (!orgId) {
                return {
                    totalJobs: 0,
                    candidatesSubmitted: 0,
                    agencyShortlisted: 0,
                    hrShortlisted: 0,
                    inInterview: 0,
                    hired: 0,
                    rejected: 0,
                };
            }

            const { data: jobs, error: jobsError } = await supabase
                .from('jobs')
                .select('id, status')
                .eq('organization_id', orgId);
            if (jobsError) throw jobsError;

            const jobRows = jobs || [];
            const jobIds = jobRows.map((row: any) => row.id).filter(Boolean);
            const totalJobs = jobRows.length;

            let appRows: any[] = [];
            const agencyAppsRes = await supabase
                .from('applications')
                .select('id, status, job_id, applied_at')
                .eq('agency_id', orgId);

            if (agencyAppsRes.error) {
                if (jobIds.length > 0) {
                    const fallbackAppsRes = await supabase
                        .from('applications')
                        .select('id, status, job_id, applied_at')
                        .in('job_id', jobIds);
                    if (fallbackAppsRes.error) throw fallbackAppsRes.error;
                    appRows = fallbackAppsRes.data || [];
                }
            } else {
                appRows = agencyAppsRes.data || [];
            }

            const appIds = appRows.map((row: any) => row.id).filter(Boolean);
            let interviewsCount = 0;
            if (appIds.length > 0) {
                const { count, error: interviewsError } = await supabase
                    .from('interviews')
                    .select('*', { count: 'exact', head: true })
                    .in('application_id', appIds)
                    .eq('status', 'scheduled');
                if (interviewsError) throw interviewsError;
                interviewsCount = Number(count || 0);
            }

            const inInterviewFromStatus = appRows.filter((row: any) =>
                ['interview', 'interview_scheduled', 'technical_interview'].includes(row.status),
            ).length;

            return {
                totalJobs,
                candidatesSubmitted: appRows.length,
                agencyShortlisted: appRows.filter((row: any) => row.status === 'agency_shortlisted').length,
                hrShortlisted: appRows.filter((row: any) => ['hr_shortlisted', 'employer_review'].includes(row.status)).length,
                inInterview: Math.max(inInterviewFromStatus, interviewsCount),
                hired: appRows.filter((row: any) => ['hired', 'offer_accepted'].includes(row.status)).length,
                rejected: appRows.filter((row: any) => row.status === 'rejected').length,
            };
        },
        enabled: !!orgId,
        staleTime: STALE_TIME,
    });

    const recentQuery = useQuery({
        queryKey: ['agency-recent-submissions', orgId],
        queryFn: async (): Promise<AgencyRecentSubmission[]> => {
            if (!orgId) return [];

            const directRes = await supabase
                .from('applications')
                .select(`
                    id, status, applied_at, job_id,
                    jobs(title),
                    profiles!applications_candidate_id_fkey(full_name)
                `)
                .eq('agency_id', orgId)
                .order('applied_at', { ascending: false })
                .limit(6);

            let rows = directRes.data || [];
            if (directRes.error) {
                const { data: jobs, error: jobsError } = await supabase
                    .from('jobs')
                    .select('id')
                    .eq('organization_id', orgId);
                if (jobsError) throw jobsError;

                const jobIds = (jobs || []).map((row: any) => row.id).filter(Boolean);
                if (jobIds.length === 0) return [];

                const fallbackRes = await supabase
                    .from('applications')
                    .select(`
                        id, status, applied_at, job_id,
                        jobs!inner(title),
                        profiles!applications_candidate_id_fkey(full_name)
                    `)
                    .in('job_id', jobIds)
                    .order('applied_at', { ascending: false })
                    .limit(6);
                if (fallbackRes.error) throw fallbackRes.error;
                rows = fallbackRes.data || [];
            }

            return rows.map((row: any) => ({
                id: row.id,
                candidateName: row.profiles?.full_name || 'Unknown',
                jobTitle: row.jobs?.title || 'Unknown Position',
                status: row.status,
                appliedAt: row.applied_at,
            }));
        },
        enabled: !!orgId,
        staleTime: STALE_TIME,
    });

    const activityQuery = useQuery({
        queryKey: ['agency-recent-activity', orgId],
        queryFn: async (): Promise<AgencyRecentActivity[]> => {
            if (!orgId) return [];

            const { data, error } = await supabase
                .from('activity_logs')
                .select('id, action_type, description, created_at')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(10);
            if (error) throw error;

            return (data || []) as AgencyRecentActivity[];
        },
        enabled: !!orgId,
        staleTime: STALE_TIME,
    });

    useEffect(() => {
        if (!orgId) return;

        const invalidate = () => {
            queryClient.invalidateQueries({ queryKey: ['agency-dashboard-stats', orgId] });
            queryClient.invalidateQueries({ queryKey: ['agency-recent-submissions', orgId] });
            queryClient.invalidateQueries({ queryKey: ['agency-recent-activity', orgId] });
        };

        const channel = supabase
            .channel(`agency-dashboard-${orgId}-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs', filter: `organization_id=eq.${orgId}` }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications', filter: `agency_id=eq.${orgId}` }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs', filter: `organization_id=eq.${orgId}` }, invalidate)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [orgId, queryClient]);

    return {
        stats: statsQuery.data,
        isLoading: statsQuery.isLoading,
        error: statsQuery.error,
        recentSubmissions: recentQuery.data || [],
        recentError: recentQuery.error,
        activity: activityQuery.data || [],
        isActivityLoading: activityQuery.isLoading,
        activityError: activityQuery.error,
    };
}
