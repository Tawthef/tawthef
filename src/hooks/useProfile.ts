import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export type UserRole = 'candidate' | 'employer' | 'agency' | 'admin' | 'expert';
export type RecruiterVerificationStatus = 'pending' | 'verified' | 'rejected';


export interface Profile {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    role: UserRole;
    organization_id: string | null;
    verification_status?: RecruiterVerificationStatus | null;
    verification_documents?: string[] | null;
    share_banner_shown: boolean | null;
    status?: string | null;
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

            const row = data as Profile;
            return {
                ...row,
                verification_documents: row.verification_documents || [],
            };
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
            queryClient.invalidateQueries({ queryKey: ['profile-strength', user.id] });
            queryClient.invalidateQueries({ queryKey: ['candidate-stats', user.id] });
            queryClient.invalidateQueries({ queryKey: ['admin-recruiter-verification'] });
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
