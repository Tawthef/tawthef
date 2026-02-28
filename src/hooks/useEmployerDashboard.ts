import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';

export interface EmployerDashboardStats {
    activeJobs: number;
    totalApplicants: number;
    shortlisted: number;
    inInterview: number;
    hired: number;
    rejected: number;
    subscriptionPlan: string | null;
    subscriptionActive: boolean;
    jobSlotsUsed: number;
    jobSlotsLimit: number;
}

export interface EmployerRecentActivity {
    id: string;
    type: 'application' | 'hire' | 'job';
    title: string;
    subtitle: string;
    date: string;
    status?: string;
}

export function useEmployerDashboard() {
    const { user } = useAuth();
    const { profile } = useProfile();
    const orgId = profile?.organization_id;

    const statsQuery = useQuery({
        queryKey: ['employer-dashboard-stats', orgId],
        queryFn: async (): Promise<EmployerDashboardStats> => {
            if (!orgId) return {
                activeJobs: 0, totalApplicants: 0, shortlisted: 0,
                inInterview: 0, hired: 0, rejected: 0,
                subscriptionPlan: null, subscriptionActive: false,
                jobSlotsUsed: 0, jobSlotsLimit: 0,
            };

            // Active jobs count
            const { count: activeJobs } = await supabase
                .from('jobs')
                .select('*', { count: 'exact', head: true })
                .eq('organization_id', orgId)
                .eq('status', 'active');

            // Get all job IDs for this org
            const { data: jobRows } = await supabase
                .from('jobs')
                .select('id')
                .eq('organization_id', orgId);

            const jobIds = (jobRows || []).map(j => j.id);

            let totalApplicants = 0, shortlisted = 0, inInterview = 0, hired = 0, rejected = 0;

            if (jobIds.length > 0) {
                const { data: apps } = await supabase
                    .from('applications')
                    .select('status')
                    .in('job_id', jobIds);

                const appList = apps || [];
                totalApplicants = appList.length;
                shortlisted = appList.filter(a =>
                    ['agency_shortlisted', 'hr_shortlisted', 'technical_shortlisted'].includes(a.status)
                ).length;
                inInterview = appList.filter(a => a.status === 'interview').length;
                hired = appList.filter(a => a.status === 'hired').length;
                rejected = appList.filter(a => a.status === 'rejected').length;
            }

            // Subscription data
            const { data: sub } = await supabase
                .from('subscriptions')
                .select('plan_type, is_active, usage_used, usage_limit, end_date')
                .eq('organization_id', orgId)
                .eq('is_active', true)
                .gte('end_date', new Date().toISOString())
                .in('plan_type', ['job_slot_basic', 'job_slot_pro'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            return {
                activeJobs: activeJobs || 0,
                totalApplicants,
                shortlisted,
                inInterview,
                hired,
                rejected,
                subscriptionPlan: sub?.plan_type || null,
                subscriptionActive: !!sub,
                jobSlotsUsed: sub?.usage_used || 0,
                jobSlotsLimit: sub?.usage_limit || 0,
            };
        },
        enabled: !!orgId,
        staleTime: 60 * 1000,
    });

    const activityQuery = useQuery({
        queryKey: ['employer-recent-activity', orgId],
        queryFn: async (): Promise<EmployerRecentActivity[]> => {
            if (!orgId) return [];

            const { data: jobRows } = await supabase
                .from('jobs')
                .select('id')
                .eq('organization_id', orgId);
            const jobIds = (jobRows || []).map(j => j.id);
            if (jobIds.length === 0) return [];

            const { data: recentApps } = await supabase
                .from('applications')
                .select(`
                    id, status, applied_at,
                    jobs!inner(title),
                    profiles!applications_candidate_id_fkey(full_name)
                `)
                .in('job_id', jobIds)
                .order('applied_at', { ascending: false })
                .limit(8);

            return (recentApps || []).map((app: any) => ({
                id: app.id,
                type: app.status === 'hired' ? 'hire' : 'application',
                title: (app.profiles?.full_name || 'Candidate') + ' applied',
                subtitle: app.jobs?.title || 'Unknown Position',
                date: app.applied_at,
                status: app.status,
            }));
        },
        enabled: !!orgId,
        staleTime: 60 * 1000,
    });

    return {
        stats: statsQuery.data,
        isLoading: statsQuery.isLoading,
        activity: activityQuery.data || [],
        isActivityLoading: activityQuery.isLoading,
    };
}
