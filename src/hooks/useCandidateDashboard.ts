import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCandidateProfile } from '@/hooks/useCandidateProfile';

interface CandidateStats {
    applicationsSubmitted: number;
    interviewsScheduled: number;
    offersReceived: number;
    profileCompleteness: number;
}

interface CandidateApplication {
    id: string;
    job_id: string;
    status: string;
    applied_at: string;
    job_title: string;
    company_name: string;
}

/**
 * Hook for candidate dashboard stats
 */
export function useCandidateStats() {
    const { user } = useAuth();
    const { profile } = useCandidateProfile();

    const query = useQuery({
        queryKey: ['candidate-stats', user?.id],
        queryFn: async (): Promise<CandidateStats> => {
            if (!user) return { applicationsSubmitted: 0, interviewsScheduled: 0, offersReceived: 0, profileCompleteness: 0 };

            // Get applications count
            const { count: appsCount } = await supabase
                .from('applications')
                .select('*', { count: 'exact', head: true })
                .eq('candidate_id', user.id);

            // Get interviews count
            const { count: interviewsCount } = await supabase
                .from('interviews')
                .select('*, applications!inner(*)', { count: 'exact', head: true })
                .eq('applications.candidate_id', user.id)
                .eq('status', 'scheduled');

            // Get offers count
            const { count: offersCount } = await supabase
                .from('offers')
                .select('*, applications!inner(*)', { count: 'exact', head: true })
                .eq('applications.candidate_id', user.id)
                .eq('status', 'sent');

            return {
                applicationsSubmitted: appsCount || 0,
                interviewsScheduled: interviewsCount || 0,
                offersReceived: offersCount || 0,
                profileCompleteness: 0, // Calculated in component
            };
        },
        enabled: !!user,
        staleTime: 60 * 1000,
    });

    // Calculate profile completeness from profile hook
    const profileCompleteness = profile
        ? Math.round(
            ((profile.skills?.length > 0 ? 40 : 0) +
                (profile.years_experience > 0 ? 30 : 0) +
                (profile.keywords?.length > 0 ? 20 : 0) +
                (profile.resume_url ? 10 : 0))
        )
        : 0;

    return {
        stats: {
            ...query.data,
            profileCompleteness,
        } as CandidateStats,
        isLoading: query.isLoading,
        error: query.error,
    };
}

/**
 * Hook for candidate applications list
 */
export function useCandidateApplications() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['candidate-applications', user?.id],
        queryFn: async (): Promise<CandidateApplication[]> => {
            if (!user) return [];

            const { data, error } = await supabase
                .from('applications')
                .select(`
          id, job_id, status, applied_at,
          jobs!inner(title, organization_id, organizations!inner(name))
        `)
                .eq('candidate_id', user.id)
                .order('applied_at', { ascending: false });

            if (error) {
                console.error('[useCandidateApplications] Error:', error);
                return [];
            }

            return (data || []).map((app: any) => ({
                id: app.id,
                job_id: app.job_id,
                status: app.status,
                applied_at: app.applied_at,
                job_title: app.jobs?.title || 'Unknown Position',
                company_name: app.jobs?.organizations?.name || 'Unknown Company',
            }));
        },
        enabled: !!user,
        staleTime: 30 * 1000,
    });
}
