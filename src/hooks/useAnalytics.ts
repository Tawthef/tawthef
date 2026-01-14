import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface TimeToHireData {
    organization_id: string;
    job_id: string;
    hire_month: string;
    hires_count: number;
    avg_days_to_hire: number;
    min_days: number;
    max_days: number;
}

export interface FunnelStage {
    organization_id: string;
    job_id: string;
    stage: string;
    stage_order: number;
    candidate_count: number;
}

export interface AgencyPerformance {
    agency_id: string;
    employer_org_id: string;
    month: string;
    candidates_submitted: number;
    shortlisted_count: number;
    employer_approved: number;
    hired_count: number;
    conversion_rate: number;
}

/**
 * Hook for Time-to-Hire analytics
 */
export function useTimeToHire() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['analytics', 'time-to-hire', user?.id],
        queryFn: async (): Promise<TimeToHireData[]> => {
            if (!user) return [];

            const { data, error } = await supabase.rpc('get_time_to_hire_analytics');

            if (error) {
                console.error('[useTimeToHire] Error:', error);
                return [];
            }

            return data || [];
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

/**
 * Hook for Hiring Funnel analytics
 */
export function useHiringFunnel(jobId?: string) {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['analytics', 'hiring-funnel', user?.id, jobId],
        queryFn: async (): Promise<FunnelStage[]> => {
            if (!user) return [];

            const { data, error } = await supabase.rpc('get_hiring_funnel_analytics');

            if (error) {
                console.error('[useHiringFunnel] Error:', error);
                return [];
            }

            let result = data || [];
            if (jobId) {
                result = result.filter((s: FunnelStage) => s.job_id === jobId);
            }

            return result;
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Hook for Agency Performance analytics
 */
export function useAgencyPerformance() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['analytics', 'agency-performance', user?.id],
        queryFn: async (): Promise<AgencyPerformance[]> => {
            if (!user) return [];

            const { data, error } = await supabase.rpc('get_agency_performance_analytics');

            if (error) {
                console.error('[useAgencyPerformance] Error:', error);
                return [];
            }

            return data || [];
        },
        enabled: !!user,
        staleTime: 5 * 60 * 1000,
    });
}

/**
 * Aggregated analytics for dashboard summary
 */
export function useAnalyticsSummary() {
    const timeToHire = useTimeToHire();
    const funnel = useHiringFunnel();
    const agencyPerf = useAgencyPerformance();

    const summary = {
        totalHires: timeToHire.data?.reduce((sum, d) => sum + d.hires_count, 0) || 0,
        avgTimeToHire: timeToHire.data?.length
            ? Math.round(timeToHire.data.reduce((sum, d) => sum + d.avg_days_to_hire, 0) / timeToHire.data.length)
            : 0,
        totalApplications: funnel.data?.filter(s => s.stage === 'applied').reduce((sum, s) => sum + s.candidate_count, 0) || 0,
        topAgencyConversion: agencyPerf.data?.length
            ? Math.max(...agencyPerf.data.map(a => a.conversion_rate))
            : 0,
    };

    return {
        summary,
        timeToHire: timeToHire.data || [],
        funnel: funnel.data || [],
        agencyPerformance: agencyPerf.data || [],
        isLoading: timeToHire.isLoading || funnel.isLoading || agencyPerf.isLoading,
        error: timeToHire.error || funnel.error || agencyPerf.error,
    };
}
