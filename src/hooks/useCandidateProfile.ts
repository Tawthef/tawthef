import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface CandidateProfile {
    id: string;
    candidate_id: string;
    skills: string[];
    years_experience: number;
    keywords: string[];
    raw_text: string | null;
    resume_url: string | null;
    created_at: string;
    updated_at: string;
}

interface UpdateProfileInput {
    skills?: string[];
    years_experience?: number;
    keywords?: string[];
    raw_text?: string;
    resume_url?: string;
}

/**
 * Simple keyword extraction from text
 */
export function extractSkills(text: string): string[] {
    const commonSkills = [
        'javascript', 'typescript', 'react', 'angular', 'vue', 'node', 'python',
        'java', 'c++', 'c#', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin',
        'html', 'css', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql',
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform',
        'git', 'agile', 'scrum', 'jira', 'figma', 'photoshop',
        'machine learning', 'data science', 'ai', 'nlp', 'deep learning',
        'project management', 'leadership', 'communication', 'teamwork'
    ];

    const lowercaseText = text.toLowerCase();
    return commonSkills.filter(skill => lowercaseText.includes(skill));
}

/**
 * Extract years of experience from text
 */
export function extractExperience(text: string): number {
    const patterns = [
        /(\d+)\+?\s*years?\s*(?:of\s*)?experience/i,
        /experience[:\s]*(\d+)\+?\s*years?/i,
        /(\d+)\+?\s*years?\s*in/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return parseInt(match[1], 10);
        }
    }
    return 0;
}

/**
 * Extract keywords from text
 */
export function extractKeywords(text: string): string[] {
    // Remove common words and extract meaningful keywords
    const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
        'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'this', 'that',
        'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your'
    ]);

    const words = text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));

    // Count word frequency
    const freq: Record<string, number> = {};
    words.forEach(word => {
        freq[word] = (freq[word] || 0) + 1;
    });

    // Return top 20 keywords by frequency
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word]) => word);
}

/**
 * Parse CV text and extract structured data
 */
export function parseCVText(text: string) {
    return {
        skills: extractSkills(text),
        years_experience: extractExperience(text),
        keywords: extractKeywords(text),
        raw_text: text,
    };
}

/**
 * Hook for managing candidate profile
 */
export function useCandidateProfile(candidateId?: string) {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const targetId = candidateId || user?.id;

    // Fetch profile
    const query = useQuery({
        queryKey: ['candidate-profile', targetId],
        queryFn: async (): Promise<CandidateProfile | null> => {
            if (!targetId) return null;

            const { data, error } = await supabase
                .from('candidate_profiles')
                .select('*')
                .eq('candidate_id', targetId)
                .maybeSingle();

            if (error) {
                console.error('[useCandidateProfile] Error:', error);
                return null;
            }

            return data;
        },
        enabled: !!targetId,
        staleTime: 5 * 60 * 1000,
    });

    // Create or update profile
    const upsertMutation = useMutation({
        mutationFn: async (input: UpdateProfileInput) => {
            if (!user) throw new Error('Not authenticated');

            const { data: existing } = await supabase
                .from('candidate_profiles')
                .select('id')
                .eq('candidate_id', user.id)
                .maybeSingle();

            if (existing) {
                const { error } = await supabase
                    .from('candidate_profiles')
                    .update({ ...input, updated_at: new Date().toISOString() })
                    .eq('candidate_id', user.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('candidate_profiles')
                    .insert({ candidate_id: user.id, ...input });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['candidate-profile'] });
        },
    });

    // Upload CV and parse
    const uploadCVMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!user) throw new Error('Not authenticated');

            // Upload file
            const filePath = `${user.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from('resumes')
                .getPublicUrl(filePath);

            // For MVP: Extract text from PDF (basic - just store URL)
            // In production, use a PDF parser library or edge function
            const cvData = {
                resume_url: urlData.publicUrl,
            };

            // Update profile
            await upsertMutation.mutateAsync(cvData);

            return cvData;
        },
    });

    // Parse text and update profile
    const parseTextMutation = useMutation({
        mutationFn: async (text: string) => {
            const parsed = parseCVText(text);
            await upsertMutation.mutateAsync(parsed);
            return parsed;
        },
    });

    return {
        profile: query.data,
        isLoading: query.isLoading,
        error: query.error,
        updateProfile: upsertMutation.mutateAsync,
        isUpdating: upsertMutation.isPending,
        uploadCV: uploadCVMutation.mutateAsync,
        isUploading: uploadCVMutation.isPending,
        parseText: parseTextMutation.mutateAsync,
        isParsing: parseTextMutation.isPending,
        refetch: query.refetch,
    };
}
