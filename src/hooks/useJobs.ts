import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface Job {
    id: string;
    title: string;
    description: string | null;
    status: 'open' | 'closed' | 'draft';
    created_at: string;
    organization_id: string;
    organization_name?: string;
    organization_type?: string;
}

/**
 * Hook to fetch jobs visible to the current user
 * RLS automatically filters based on user role
 */
export function useCreateJob() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (fields: { title: string; description: string; status: 'open' | 'draft' }) => {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user!.id)
                .single();

            if (profileError || !profile?.organization_id) {
                throw new Error('No organization found for this account');
            }

            const { error } = await supabase.from('jobs').insert({
                title: fields.title,
                description: fields.description || null,
                status: fields.status,
                organization_id: profile.organization_id,
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
    });
}

export function useUpdateJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (fields: { id: string; title: string; description: string; status: 'open' | 'draft' | 'closed' }) => {
            const { error } = await supabase
                .from('jobs')
                .update({ title: fields.title, description: fields.description || null, status: fields.status })
                .eq('id', fields.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
    });
}

export function useDeleteJob() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (jobId: string) => {
            const { error } = await supabase.from('jobs').delete().eq('id', jobId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] });
        },
    });
}

export function useJobs() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['jobs', user?.id],
        queryFn: async (): Promise<Job[]> => {
            if (!user) return [];

            // Try jobs_with_org view first, fall back to jobs table
            const { data, error } = await supabase
                .from('jobs_with_org')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                // Fallback to jobs table if view doesn't exist
                console.warn('[useJobs] View not found, using jobs table:', error.message);
                const { data: jobsData, error: jobsError } = await supabase
                    .from('jobs')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (jobsError) {
                    throw jobsError;
                }
                return jobsData as Job[];
            }

            return data as Job[];
        },
        enabled: !!user,
        staleTime: 60000,
    });

    useEffect(() => {
        if (!user?.id) return;

        const invalidate = () => {
            queryClient.invalidateQueries({ queryKey: ['jobs', user.id] });
        };

        const channel = supabase
            .channel(`jobs-realtime-${user.id}-${Date.now()}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, invalidate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'organizations' }, invalidate)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient, user?.id]);

    return {
        jobs: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
}
