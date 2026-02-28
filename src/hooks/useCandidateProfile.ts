import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface CandidateProfile {
    id: string;
    candidate_id: string;
    skills: string[];
    job_titles: string[];
    years_experience: number;
    keywords: string[];
    education: string[];
    location: string;
    raw_text: string | null;
    resume_text: string | null;
    resume_url: string | null;
    parsed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface ParsedResumeData {
    skills: string[];
    job_titles: string[];
    years_experience: number;
    education: string[];
    location: string;
    keywords: string[];
}

interface UpdateProfileInput {
    skills?: string[];
    job_titles?: string[];
    years_experience?: number;
    keywords?: string[];
    education?: string[];
    location?: string;
    raw_text?: string;
    resume_text?: string;
    resume_url?: string;
    parsed_at?: string;
}

export type ParseStatus = 'idle' | 'uploading' | 'parsing' | 'done' | 'error';

/**
 * Hook for managing candidate profile with AI CV parsing
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

            return data ? {
                ...data,
                skills: data.skills || [],
                job_titles: data.job_titles || [],
                keywords: data.keywords || [],
                education: data.education || [],
                location: data.location || '',
                years_experience: data.years_experience || 0,
            } : null;
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

    // Upload CV file to Supabase Storage
    const uploadCVMutation = useMutation({
        mutationFn: async (file: File): Promise<{ resume_url: string }> => {
            if (!user) throw new Error('Not authenticated');

            // Size check
            if (file.size > 5 * 1024 * 1024) {
                throw new Error('File size must be under 5MB');
            }

            const filePath = `${user.id}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('resumes')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('resumes')
                .getPublicUrl(filePath);

            const resume_url = urlData.publicUrl;

            // Save resume_url immediately
            await upsertMutation.mutateAsync({ resume_url });

            return { resume_url };
        },
    });

    // Parse resume text via serverless function
    const parseResumeMutation = useMutation({
        mutationFn: async (resumeText: string): Promise<ParsedResumeData> => {
            if (!user) throw new Error('Not authenticated');

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) throw new Error('No auth session');

            // Call the Netlify serverless function
            const response = await fetch('/api/parse-resume', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ resume_text: resumeText }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to parse resume');
            }

            const parsed: ParsedResumeData = await response.json();

            // Save parsed data to database
            await upsertMutation.mutateAsync({
                skills: parsed.skills,
                job_titles: parsed.job_titles,
                years_experience: parsed.years_experience,
                education: parsed.education,
                location: parsed.location,
                keywords: parsed.keywords,
                resume_text: resumeText,
                raw_text: resumeText,
                parsed_at: new Date().toISOString(),
            });

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
        parseResume: parseResumeMutation.mutateAsync,
        isParsing: parseResumeMutation.isPending,
        refetch: query.refetch,
    };
}

/**
 * Basic client-side text extractor for PDF.
 * For production, the serverless function receives the raw text.
 * This is used as a best-effort client-side extraction.
 */
export async function extractTextFromFile(file: File): Promise<string> {
    // For DOCX/TXT files, read as text
    if (file.name.endsWith('.txt')) {
        return await file.text();
    }

    // For PDF: use FileReader to extract what we can
    // In production, a proper PDF parser (pdf.js) would be used
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
            const text = reader.result as string;
            // Basic PDF text extraction - strips binary content
            const extracted = text
                .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            resolve(extracted || `[File: ${file.name}]`);
        };
        reader.onerror = () => resolve(`[File: ${file.name}]`);
        reader.readAsText(file);
    });
}
