import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';

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

    const statsQuery = useQuery({
        queryKey: ['agency-dashboard-stats', orgId],
        queryFn: async (): Promise<AgencyDashboardStats> => {
            if (!orgId) return {
                totalJobs: 0, candidatesSubmitted: 0,
                agencyShortlisted: 0, hrShortlisted: 0,
                inInterview: 0, hired: 0, rejected: 0,
            };

            // Jobs posted by this agency
            const { count: totalJobs } = await supabase
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId);

            // All applications submitted via this agency's jobs
            const { data: jobRows } = await supabase
                .from('jobs')
                .select('id')
                .eq('organization_id', orgId);
            const jobIds = (jobRows || []).map(j => j.id);

            let candidatesSubmitted = 0, agencyShortlisted = 0;
            let hrShortlisted = 0, inInterview = 0, hired = 0, rejected = 0;

            if (jobIds.length > 0) {
                const { data: apps } = await supabase
                    .from('applications')
                    .select('status')
                    .in('job_id', jobIds);

                const appList = apps || [];
                candidatesSubmitted = appList.length;
                agencyShortlisted = appList.filter(a => a.status === 'agency_shortlisted').length;
                hrShortlisted = appList.filter(a => a.status === 'hr_shortlisted').length;
                inInterview = appList.filter(a => a.status === 'interview').length;
                hired = appList.filter(a => a.status === 'hired').length;
                rejected = appList.filter(a => a.status === 'rejected').length;
            }

            return {
                totalJobs: totalJobs || 0,
                candidatesSubmitted,
                agencyShortlisted,
                hrShortlisted,
                inInterview,
                hired,
                rejected,
            };
        },
        enabled: !!orgId,
        staleTime: 60 * 1000,
    });

    const recentQuery = useQuery({
        queryKey: ['agency-recent-submissions', orgId],
        queryFn: async (): Promise<AgencyRecentSubmission[]> => {
            if (!orgId) return [];

            const { data: jobRows } = await supabase
                .from('jobs')
                .select('id')
                .eq('organization_id', orgId);
            const jobIds = (jobRows || []).map(j => j.id);
            if (jobIds.length === 0) return [];

            const { data } = await supabase
                .from('applications')
                .select(`
                    id, status, applied_at,
                    jobs!inner(title),
                    profiles!applications_candidate_id_fkey(full_name)
                `)
                .in('job_id', jobIds)
                .order('applied_at', { ascending: false })
                .limit(6);

            return (data || []).map((app: any) => ({
                id: app.id,
                candidateName: app.profiles?.full_name || 'Unknown',
                jobTitle: app.jobs?.title || 'Unknown Position',
                status: app.status,
                appliedAt: app.applied_at,
            }));
        },
        enabled: !!orgId,
        staleTime: 60 * 1000,
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

            if (error) {
                console.error('[useAgencyDashboard] Activity error:', error);
                return [];
            }

            return (data || []) as AgencyRecentActivity[];
        },
        enabled: !!orgId,
        staleTime: 60 * 1000,
    });

    return {
        stats: statsQuery.data,
        isLoading: statsQuery.isLoading,
        recentSubmissions: recentQuery.data || [],
        activity: activityQuery.data || [],
        isActivityLoading: activityQuery.isLoading,
    };
}
