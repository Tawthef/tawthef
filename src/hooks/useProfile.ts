import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export type UserRole = 'candidate' | 'employer' | 'agency' | 'admin';

export interface Profile {
    id: string;
    full_name: string | null;
    role: UserRole;
    organization_id: string | null;
    created_at: string;
}

/**
 * Hook to fetch and manage the current user's profile
 */
export function useProfile() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['profile', user?.id],
        queryFn: async (): Promise<Profile | null> => {
            if (!user) return null;

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('[useProfile] Error fetching profile:', error);
                return null;
            }

            return data as Profile;
        },
        enabled: !!user, // Only run when user is logged in
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    const updateProfile = async (updates: Partial<Omit<Profile, 'id' | 'created_at'>>) => {
        if (!user) return { error: new Error('Not authenticated') };

        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);

        if (!error) {
            // Invalidate cache to refetch
            queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
        }

        return { error };
    };

    return {
        profile: query.data,
        isLoading: query.isLoading,
        error: query.error,
        updateProfile,
        refetch: query.refetch,
    };
}
