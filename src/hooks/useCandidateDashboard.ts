import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['candidate-stats', user?.id],
        queryFn: async (): Promise<CandidateStats> => {
            if (!user) return { applicationsSubmitted: 0, interviewsScheduled: 0, offersReceived: 0, profileCompleteness: 0 };

            const [appsRes, interviewsRes, offersRes, strengthRes, candidateProfileRes] = await Promise.all([
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
                supabase
                    .from('candidate_profiles')
                    .select('location, skills, years_experience, education, resume_url')
                    .eq('candidate_id', user.id)
                    .maybeSingle(),
            ]);

            const appsCount = appsRes.count || 0;
            const interviewsCount = interviewsRes.count || 0;
            const offersCount = offersRes.count || 0;

            if (appsRes.error) throw appsRes.error;
            if (interviewsRes.error) throw interviewsRes.error;
            if (offersRes.error) throw offersRes.error;

            const strengthRow = Array.isArray(strengthRes.data) ? strengthRes.data[0] : strengthRes.data;
            const candidateProfile = candidateProfileRes.data as any;

            if (strengthRes.error) {
                console.error('[useCandidateStats] Profile strength error:', strengthRes.error);
            }
            if (candidateProfileRes.error) {
                console.error('[useCandidateStats] Candidate profile error:', candidateProfileRes.error);
            }

            const fallbackProfileCompleteness = (() => {
                let score = 0;
                if (candidateProfile?.location) score += 20;
                if (Array.isArray(candidateProfile?.skills) && candidateProfile.skills.length > 0) score += 20;
                if (Number(candidateProfile?.years_experience || 0) > 0) score += 20;
                if (Array.isArray(candidateProfile?.education) && candidateProfile.education.length > 0) score += 20;
                if (candidateProfile?.resume_url) score += 20;
                return score;
            })();

            const profileCompleteness = Number(strengthRow?.percentage ?? fallbackProfileCompleteness ?? 0);

            return {
                applicationsSubmitted: appsCount,
                interviewsScheduled: interviewsCount,
                offersReceived: offersCount,
                profileCompleteness,
            };
        },
        enabled: !!user,
        staleTime: 60000,
    });

    useEffect(() => {
        if (!user?.id) return;

        const invalidate = () => {
            queryClient.invalidateQueries({ queryKey: ['candidate-stats', user.id] });
            queryClient.invalidateQueries({ queryKey: ['candidate-applications', user.id] });
            queryClient.invalidateQueries({ queryKey: ['profile-strength', user.id] });
        };

        const channel = supabase
            .channel(`candidate-dashboard-${user.id}-${Date.now()}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'applications', filter: `candidate_id=eq.${user.id}` },
                invalidate,
            )
            .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'offers' }, invalidate)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'candidate_profiles', filter: `candidate_id=eq.${user.id}` },
                invalidate,
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, user?.id]);

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
    const queryClient = useQueryClient();

    const query = useQuery({
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

            if (error) throw error;

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
        staleTime: 60000,
    });

    useEffect(() => {
        if (!user?.id) return;

        const invalidate = () => {
            queryClient.invalidateQueries({ queryKey: ['candidate-applications', user.id] });
        };

        const channel = supabase
            .channel(`candidate-applications-${user.id}-${Date.now()}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'applications', filter: `candidate_id=eq.${user.id}` },
                invalidate,
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, user?.id]);

    return query;
}
