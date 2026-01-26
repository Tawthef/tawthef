import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';

interface JobReportData {
    job: {
        id: string;
        title: string;
        location: string | null;
        status: 'open' | 'closed' | 'draft';
        posted_at: string;
        total_candidates: number;
    };
    kpis: {
        total_applicants: number;
        shortlisted: number;
        in_interview: number;
        offers_sent: number;
        hired: number;
    };
    statusBreakdown: Array<{
        status: string;
        count: number;
        color: string;
    }>;
    interviewSuitability: {
        suitable: number;
        not_suitable: number;
    };
    sources: Array<{
        name: string;
        value: number;
    }>;
    geography: Array<{
        country: string;
        count: number;
    }>;
    timeline: Array<{
        date: string;
        interviews: number;
    }>;
}

const STATUS_COLORS: Record<string, string> = {
    applied: 'hsl(var(--muted))',
    agency_shortlisted: 'hsl(var(--primary))',
    employer_review: 'hsl(var(--accent))',
    technical_approved: 'hsl(var(--warning))',
    interviewed: 'hsl(var(--warning))',
    offered: 'hsl(var(--success))',
    hired: 'hsl(var(--success))',
    rejected: 'hsl(var(--destructive))',
};

/**
 * Hook to fetch and aggregate job report data
 */
export function useJobReport(jobId: string | undefined) {
    const { user } = useAuth();
    const { profile } = useProfile();

    const query = useQuery({
        queryKey: ['job-report', jobId, profile?.organization_id],
        queryFn: async (): Promise<JobReportData | null> => {
            if (!jobId || !user) return null;

            // Fetch job details
            const { data: jobData, error: jobError } = await supabase
                .from('jobs')
                .select('id, title, location, status, created_at, organization_id')
                .eq('id', jobId)
                .single();

            if (jobError || !jobData) {
                console.error('[useJobReport] Error fetching job:', jobError);
                return null;
            }

            // Fetch applications for this job
            let applicationsQuery = supabase
                .from('applications')
                .select(`
          id,
          status,
          applied_at,
          source,
          candidate_id,
          profiles!applications_candidate_id_fkey(country)
        `)
                .eq('job_id', jobId);

            // If agency, filter to only their submissions
            if (profile?.role === 'agency' && profile?.organization_id) {
                applicationsQuery = applicationsQuery.eq('agency_id', profile.organization_id);
            }

            const { data: applications, error: appsError } = await applicationsQuery;

            if (appsError) {
                console.error('[useJobReport] Error fetching applications:', appsError);
                return null;
            }

            const apps = applications || [];

            // Calculate KPIs
            const kpis = {
                total_applicants: apps.length,
                shortlisted: apps.filter(a => ['agency_shortlisted', 'employer_review', 'technical_approved', 'interviewed', 'offered', 'hired'].includes(a.status)).length,
                in_interview: apps.filter(a => a.status === 'interviewed').length,
                offers_sent: apps.filter(a => ['offered', 'hired'].includes(a.status)).length,
                hired: apps.filter(a => a.status === 'hired').length,
            };

            // Status breakdown
            const statusCounts: Record<string, number> = {};
            apps.forEach(app => {
                statusCounts[app.status] = (statusCounts[app.status] || 0) + 1;
            });

            const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
                status: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                count,
                color: STATUS_COLORS[status] || 'hsl(var(--muted))',
            }));

            // Interview suitability (technical_approved or better)
            const suitable = apps.filter(a => ['technical_approved', 'interviewed', 'offered', 'hired'].includes(a.status)).length;
            const interviewSuitability = {
                suitable,
                not_suitable: apps.length - suitable,
            };

            // Candidate sources
            const sourceCounts: Record<string, number> = {};
            apps.forEach(app => {
                const source = app.source || 'direct';
                sourceCounts[source] = (sourceCounts[source] || 0) + 1;
            });

            const sources = Object.entries(sourceCounts).map(([name, value]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value,
            }));

            // Geography distribution
            const countryCounts: Record<string, number> = {};
            apps.forEach(app => {
                const country = (app.profiles as any)?.country || 'Unknown';
                countryCounts[country] = (countryCounts[country] || 0) + 1;
            });

            const geography = Object.entries(countryCounts)
                .map(([country, count]) => ({ country, count }))
                .sort((a, b) => b.count - a.count);

            // Interview timeline (mock data - would need interviews table)
            const timeline: Array<{ date: string; interviews: number }> = [];
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                timeline.push({
                    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    interviews: Math.floor(Math.random() * 5), // Mock data
                });
            }

            return {
                job: {
                    id: jobData.id,
                    title: jobData.title,
                    location: jobData.location,
                    status: jobData.status as 'open' | 'closed' | 'draft',
                    posted_at: jobData.created_at,
                    total_candidates: apps.length,
                },
                kpis,
                statusBreakdown,
                interviewSuitability,
                sources,
                geography,
                timeline,
            };
        },
        enabled: !!jobId && !!user,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}
