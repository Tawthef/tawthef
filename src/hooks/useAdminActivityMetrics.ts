import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

const STALE_TIME = 60000;
const MAX_ROWS = 10000;
const ADMIN_ACTIVITY_QUERY_KEY = ['admin-activity'] as const;

interface ProfileRow {
    id: string;
    full_name: string | null;
    role: string | null;
    organization_id: string | null;
}

interface ApplicationRow {
    id: string;
    candidate_id: string | null;
    job_id: string | null;
    applied_at: string | null;
}

interface InterviewRow {
    id: string;
    application_id: string | null;
    scheduled_at: string | null;
    created_at: string | null;
}

interface JobRow {
    id: string;
    organization_id: string | null;
    created_at: string | null;
}

interface OrganizationRow {
    id: string;
    name: string | null;
}

export interface MostActiveCandidate {
    id: string;
    full_name: string;
    applications_count: number;
    interviews_count: number;
    activity_score: number;
    last_activity: string | null;
}

export interface MostActiveRecruiter {
    id: string;
    full_name: string;
    company: string;
    jobs_posted: number;
    applications_managed: number;
    activity_score: number;
    last_activity: string | null;
}

const getLatestTimestamp = (...values: Array<string | null | undefined>) => {
    let latestValue: string | null = null;
    let latestTime = 0;

    values.forEach((value) => {
        if (!value) return;
        const time = new Date(value).getTime();
        if (!Number.isFinite(time) || time < latestTime) return;
        latestTime = time;
        latestValue = value;
    });

    return latestValue;
};

const compareByActivity = <
    T extends { activity_score: number; last_activity: string | null; full_name: string }
>(
    left: T,
    right: T,
) => {
    if (right.activity_score !== left.activity_score) {
        return right.activity_score - left.activity_score;
    }

    const leftTime = left.last_activity ? new Date(left.last_activity).getTime() : 0;
    const rightTime = right.last_activity ? new Date(right.last_activity).getTime() : 0;

    if (rightTime !== leftTime) {
        return rightTime - leftTime;
    }

    return left.full_name.localeCompare(right.full_name);
};

const fetchProfiles = async () => {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, organization_id')
        .limit(MAX_ROWS);

    if (error) throw error;
    return (data || []) as ProfileRow[];
};

const fetchApplications = async () => {
    const { data, error } = await supabase
        .from('applications')
        .select('id, candidate_id, job_id, applied_at')
        .limit(MAX_ROWS);

    if (error) throw error;
    return (data || []) as ApplicationRow[];
};

const fetchInterviews = async () => {
    const { data, error } = await supabase
        .from('interviews')
        .select('id, application_id, scheduled_at, created_at')
        .limit(MAX_ROWS);

    if (error) throw error;
    return (data || []) as InterviewRow[];
};

const fetchJobs = async () => {
    const { data, error } = await supabase
        .from('jobs')
        .select('id, organization_id, created_at')
        .limit(MAX_ROWS);

    if (error) throw error;
    return (data || []) as JobRow[];
};

const fetchOrganizations = async () => {
    const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .limit(MAX_ROWS);

    if (error) throw error;
    return (data || []) as OrganizationRow[];
};

export async function getMostActiveCandidates(): Promise<MostActiveCandidate[]> {
    const [profiles, applications, interviews] = await Promise.all([
        fetchProfiles(),
        fetchApplications(),
        fetchInterviews(),
    ]);

    const candidateProfiles = profiles.filter((profile) => profile.role === 'candidate');
    const activityByCandidateId = new Map<
        string,
        Pick<MostActiveCandidate, 'applications_count' | 'interviews_count' | 'last_activity'>
    >();
    const candidateIdByApplicationId = new Map<string, string>();

    applications.forEach((application) => {
        if (!application.candidate_id) return;

        candidateIdByApplicationId.set(application.id, application.candidate_id);

        const current = activityByCandidateId.get(application.candidate_id) || {
            applications_count: 0,
            interviews_count: 0,
            last_activity: null,
        };

        current.applications_count += 1;
        current.last_activity = getLatestTimestamp(
            current.last_activity,
            application.applied_at,
        );

        activityByCandidateId.set(application.candidate_id, current);
    });

    interviews.forEach((interview) => {
        if (!interview.application_id) return;

        const candidateId = candidateIdByApplicationId.get(interview.application_id);
        if (!candidateId) return;

        const current = activityByCandidateId.get(candidateId) || {
            applications_count: 0,
            interviews_count: 0,
            last_activity: null,
        };

        current.interviews_count += 1;
        current.last_activity = getLatestTimestamp(
            current.last_activity,
            interview.scheduled_at,
            interview.created_at,
        );

        activityByCandidateId.set(candidateId, current);
    });

    return candidateProfiles
        .map((profile) => {
            const activity = activityByCandidateId.get(profile.id);
            const applicationsCount = activity?.applications_count || 0;
            const interviewsCount = activity?.interviews_count || 0;

            return {
                id: profile.id,
                full_name: profile.full_name || 'Candidate',
                applications_count: applicationsCount,
                interviews_count: interviewsCount,
                activity_score: applicationsCount + interviewsCount,
                last_activity: activity?.last_activity || null,
            };
        })
        .sort(compareByActivity)
        .slice(0, 10);
}

export async function getMostActiveRecruiters(): Promise<MostActiveRecruiter[]> {
    const [profiles, organizations, jobs, applications] = await Promise.all([
        fetchProfiles(),
        fetchOrganizations(),
        fetchJobs(),
        fetchApplications(),
    ]);

    const recruiterProfiles = profiles.filter(
        (profile) => (profile.role === 'employer' || profile.role === 'agency') && profile.organization_id,
    );
    const organizationNameById = new Map(
        organizations.map((organization) => [organization.id, organization.name || 'Unknown company']),
    );
    const activityByOrganizationId = new Map<
        string,
        Pick<MostActiveRecruiter, 'jobs_posted' | 'applications_managed' | 'last_activity'>
    >();
    const organizationIdByJobId = new Map<string, string>();

    jobs.forEach((job) => {
        if (!job.organization_id) return;

        organizationIdByJobId.set(job.id, job.organization_id);

        const current = activityByOrganizationId.get(job.organization_id) || {
            jobs_posted: 0,
            applications_managed: 0,
            last_activity: null,
        };

        current.jobs_posted += 1;
        current.last_activity = getLatestTimestamp(current.last_activity, job.created_at);

        activityByOrganizationId.set(job.organization_id, current);
    });

    applications.forEach((application) => {
        if (!application.job_id) return;

        const organizationId = organizationIdByJobId.get(application.job_id);
        if (!organizationId) return;

        const current = activityByOrganizationId.get(organizationId) || {
            jobs_posted: 0,
            applications_managed: 0,
            last_activity: null,
        };

        current.applications_managed += 1;
        current.last_activity = getLatestTimestamp(
            current.last_activity,
            application.applied_at,
        );

        activityByOrganizationId.set(organizationId, current);
    });

    return recruiterProfiles
        .map((profile) => {
            const organizationId = profile.organization_id || '';
            const activity = activityByOrganizationId.get(organizationId);
            const jobsPosted = activity?.jobs_posted || 0;
            const applicationsManaged = activity?.applications_managed || 0;

            return {
                id: profile.id,
                full_name: profile.full_name || 'Recruiter',
                company: organizationNameById.get(organizationId) || 'Unknown company',
                jobs_posted: jobsPosted,
                applications_managed: applicationsManaged,
                activity_score: jobsPosted + applicationsManaged,
                last_activity: activity?.last_activity || null,
            };
        })
        .sort(compareByActivity)
        .slice(0, 10);
}

export function useAdminActivityMetrics() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const mostActiveCandidatesQuery = useQuery({
        queryKey: [...ADMIN_ACTIVITY_QUERY_KEY, user?.id, 'candidates'],
        queryFn: getMostActiveCandidates,
        enabled: !!user,
        staleTime: STALE_TIME,
    });

    const mostActiveRecruitersQuery = useQuery({
        queryKey: [...ADMIN_ACTIVITY_QUERY_KEY, user?.id, 'recruiters'],
        queryFn: getMostActiveRecruiters,
        enabled: !!user,
        staleTime: STALE_TIME,
    });

    useEffect(() => {
        if (!user?.id) return;

        const invalidate = () => {
            queryClient.invalidateQueries({ queryKey: ADMIN_ACTIVITY_QUERY_KEY });
        };

        const channel = supabase
            .channel(`admin-activity-${user.id}-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, invalidate)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, user?.id]);

    return {
        mostActiveCandidates: mostActiveCandidatesQuery.data || [],
        mostActiveRecruiters: mostActiveRecruitersQuery.data || [],
        isCandidatesLoading: mostActiveCandidatesQuery.isLoading,
        isRecruitersLoading: mostActiveRecruitersQuery.isLoading,
        candidatesError: mostActiveCandidatesQuery.error,
        recruitersError: mostActiveRecruitersQuery.error,
        refetch: () => Promise.all([mostActiveCandidatesQuery.refetch(), mostActiveRecruitersQuery.refetch()]),
    };
}
