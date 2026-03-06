import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

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

    const query = useQuery({
        queryKey: ['candidate-stats', user?.id],
        queryFn: async (): Promise<CandidateStats> => {
            if (!user) return { applicationsSubmitted: 0, interviewsScheduled: 0, offersReceived: 0, profileCompleteness: 0 };

            const [appsRes, interviewsRes, offersRes, strengthRes] = await Promise.all([
                supabase
                    .from('applications')
                    .select('*', { count: 'exact', head: true })
                    .eq('candidate_id', user.id),
                supabase
                    .from('interviews')
                    .select('*, applications!inner(*)', { count: 'exact', head: true })
                    .eq('applications.candidate_id', user.id)
                    .eq('status', 'scheduled'),
                supabase
                    .from('offers')
                    .select('*, applications!inner(*)', { count: 'exact', head: true })
                    .eq('applications.candidate_id', user.id)
                    .eq('status', 'sent'),
                supabase.rpc('calculate_profile_strength', {
                    p_candidate_id: user.id,
                }),
            ]);

            const appsCount = appsRes.count || 0;
            const interviewsCount = interviewsRes.count || 0;
            const offersCount = offersRes.count || 0;

            if (strengthRes.error) {
                console.error('[useCandidateStats] Profile strength error:', strengthRes.error);
            }

            const strengthRow = Array.isArray(strengthRes.data) ? strengthRes.data[0] : strengthRes.data;
            const profileCompleteness = Number(strengthRow?.percentage || 0);

            return {
                applicationsSubmitted: appsCount,
                interviewsScheduled: interviewsCount,
                offersReceived: offersCount,
                profileCompleteness,
            };
        },
        enabled: !!user,
        staleTime: 60 * 1000,
    });

    return {
        stats: query.data as CandidateStats,
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
        staleTime: 60 * 1000,
    });
}
