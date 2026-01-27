import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfile } from './useProfile';

export interface TalentSearchResult {
    id: string;
    candidate_id: string;
    full_name: string;
    job_titles: string[];
    skills: string[];
    years_experience: number;
    location: string | null;
    education: string[] | null;
    resume_url: string | null;
    match_score: number;
}

interface SearchFilters {
    query: string;
    location: string;
    skills: string[];
    minExperience: number | null;
    maxExperience: number | null;
}

export function useTalentSearch() {
    const { profile } = useProfile();
    const [filters, setFilters] = useState<SearchFilters>({
        query: '',
        location: '',
        skills: [],
        minExperience: null,
        maxExperience: null
    });
    const [page, setPage] = useState(0);
    const PAGE_SIZE = 20;

    // Check if user has subscription (mock for now, should check robustly)
    // In a real app, strict checks should be server-side or via Subscription Hook
    const hasAccess = true; // For demo purposes, we unlock. In prod, use useSubscription()

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['talent-search', filters, page],
        queryFn: async () => {
            // Construct RPC params
            const params: any = {
                p_limit: PAGE_SIZE,
                p_offset: page * PAGE_SIZE,
            };

            if (filters.query) params.p_query = filters.query;
            if (filters.location) params.p_location = filters.location;
            if (filters.skills.length > 0) params.p_skills = filters.skills;
            if (filters.minExperience !== null) params.p_min_experience = filters.minExperience;

            // Call RPC
            const { data, error } = await supabase
                .rpc('search_candidates', params);

            if (error) {
                console.error('Search Error:', error);
                throw error;
            }

            return {
                candidates: data as TalentSearchResult[],
                total: data && data.length > 0 ? (data[0] as any).total_count : 0
            };
        },
        enabled: !!profile, // Only run if logged in
        staleTime: 60000, // 1 minute cache
    });

    return {
        results: data?.candidates || [],
        totalCount: data?.total || 0,
        isLoading,
        error,
        filters,
        setFilters,
        page,
        setPage,
        hasAccess, // Expose subscription status to UI
        refetch
    };
}
