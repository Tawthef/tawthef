import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signUp: (email: string, password: string, metadata?: { full_name?: string; role?: string; company_name?: string; invite_code?: string }) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const OAUTH_ROLE_STORAGE_KEY = 'tawthef:pending-oauth-role';

const isOAuthProvider = (provider?: string) => !!provider && provider !== 'email';

const getPendingOAuthRole = () => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(OAUTH_ROLE_STORAGE_KEY);
};

const clearPendingOAuthRole = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(OAUTH_ROLE_STORAGE_KEY);
};

const getOAuthCandidateProfile = (user: User) => {
    const metadata = user.user_metadata || {};
    const fullName =
        metadata.full_name ||
        metadata.name ||
        [metadata.given_name, metadata.family_name].filter(Boolean).join(' ') ||
        null;
    const avatarUrl = metadata.avatar_url || metadata.picture || null;

    return {
        id: user.id,
        full_name: fullName || null,
        email: user.email || null,
        avatar_url: avatarUrl,
        role: 'candidate',
        created_at: user.created_at || new Date().toISOString(),
    };
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const ensureOAuthCandidateProfile = async (authUser: User | null) => {
            if (!authUser) return;

            const provider = authUser.app_metadata?.provider;
            if (!isOAuthProvider(provider)) return;

            const pendingRole = getPendingOAuthRole();
            const { data: existingProfile, error: existingProfileError } = await supabase
                .from('profiles')
                .select('id, full_name, email, avatar_url, role')
                .eq('id', authUser.id)
                .maybeSingle();

            if (existingProfileError) {
                console.error('[Auth] Failed to check OAuth profile:', existingProfileError);
                return;
            }

            const shouldProvisionCandidate =
                pendingRole === 'candidate' ||
                existingProfile?.role === 'candidate' ||
                authUser.user_metadata?.role === 'candidate';

            if (!shouldProvisionCandidate) {
                clearPendingOAuthRole();
                return;
            }

            const oauthProfile = getOAuthCandidateProfile(authUser);

            if (!existingProfile?.id) {
                const { error: insertError } = await supabase
                    .from('profiles')
                    .insert(oauthProfile);

                if (insertError) {
                    console.error('[Auth] Failed to create OAuth candidate profile:', insertError);
                    return;
                }
            } else if (existingProfile.role === 'candidate') {
                const updates: Record<string, string | null> = {};

                if (!existingProfile.full_name && oauthProfile.full_name) {
                    updates.full_name = oauthProfile.full_name;
                }
                if (!existingProfile.email && oauthProfile.email) {
                    updates.email = oauthProfile.email;
                }
                if (!existingProfile.avatar_url && oauthProfile.avatar_url) {
                    updates.avatar_url = oauthProfile.avatar_url;
                }

                if (Object.keys(updates).length > 0) {
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update(updates)
                        .eq('id', authUser.id);

                    if (updateError) {
                        console.error('[Auth] Failed to update OAuth candidate profile:', updateError);
                    }
                }
            }

            const { data: existingCandidateProfile, error: existingCandidateProfileError } = await supabase
                .from('candidate_profiles')
                .select('id')
                .eq('candidate_id', authUser.id)
                .maybeSingle();

            if (existingCandidateProfileError) {
                console.error('[Auth] Failed to check candidate profile row:', existingCandidateProfileError);
                return;
            }

            if (!existingCandidateProfile?.id) {
                const timestamp = new Date().toISOString();
                const { error: candidateProfileInsertError } = await supabase
                    .from('candidate_profiles')
                    .insert({
                        candidate_id: authUser.id,
                        skills: [],
                        job_titles: [],
                        years_experience: 0,
                        keywords: [],
                        education: [],
                        location: '',
                        created_at: timestamp,
                        updated_at: timestamp,
                    });

                if (candidateProfileInsertError) {
                    console.error('[Auth] Failed to create OAuth candidate profile row:', candidateProfileInsertError);
                    return;
                }
            }

            clearPendingOAuthRole();
        };

        const syncAuthState = async (nextSession: Session | null) => {
            const nextUser = nextSession?.user ?? null;
            await ensureOAuthCandidateProfile(nextUser);
            setSession(nextSession);
            setUser(nextUser);
            setLoading(false);
        };

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            void syncAuthState(session);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setLoading(true);
                void syncAuthState(session);
            }
        );

        // Cleanup subscription on unmount
        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error as Error | null };

        // Prevent suspended accounts from maintaining an authenticated session.
        const { data: profile } = await supabase
            .from('profiles')
            .select('status')
            .eq('id', data.user.id)
            .maybeSingle();

        if (profile?.status === 'suspended') {
            await supabase.auth.signOut();
            return { error: new Error('Your account is suspended. Please contact support.') };
        }

        return { error: null };
    };

    const signUp = async (
        email: string,
        password: string,
        metadata?: { full_name?: string; role?: string; company_name?: string; invite_code?: string },
    ) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata, // This gets stored in raw_user_meta_data and picked up by trigger
            },
        });
        return { error: error as Error | null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    const value = {
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
