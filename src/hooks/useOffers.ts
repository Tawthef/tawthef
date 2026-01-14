import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface Offer {
    id: string;
    application_id: string;
    salary: number;
    currency: string;
    start_date: string;
    status: 'sent' | 'accepted' | 'declined' | 'expired';
    sent_at: string;
    responded_at: string | null;
    created_by: string;
    created_at: string;
    // Joined data
    candidate_name?: string;
    job_title?: string;
}

interface CreateOfferInput {
    applicationId: string;
    salary: number;
    currency?: string;
    startDate: string;
}

/**
 * Hook for managing offers
 */
export function useOffers(applicationId?: string) {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch offers (filtered by applicationId if provided)
    const query = useQuery({
        queryKey: ['offers', applicationId || 'all', user?.id],
        queryFn: async (): Promise<Offer[]> => {
            if (!user) return [];

            let queryBuilder = supabase
                .from('offers')
                .select(`
          id, application_id, salary, currency, start_date, status, sent_at, responded_at, created_by, created_at,
          applications!inner(
            candidate_id,
            profiles!applications_candidate_id_fkey(full_name),
            jobs!inner(title)
          )
        `)
                .order('created_at', { ascending: false });

            if (applicationId) {
                queryBuilder = queryBuilder.eq('application_id', applicationId);
            }

            const { data, error } = await queryBuilder;

            if (error) {
                console.error('[useOffers] Error:', error);
                return [];
            }

            return (data || []).map((offer: any) => ({
                id: offer.id,
                application_id: offer.application_id,
                salary: offer.salary,
                currency: offer.currency,
                start_date: offer.start_date,
                status: offer.status,
                sent_at: offer.sent_at,
                responded_at: offer.responded_at,
                created_by: offer.created_by,
                created_at: offer.created_at,
                candidate_name: offer.applications?.profiles?.full_name || 'Unknown',
                job_title: offer.applications?.jobs?.title,
            }));
        },
        enabled: !!user,
        staleTime: 30 * 1000,
    });

    // Create offer (Employer)
    const createMutation = useMutation({
        mutationFn: async (input: CreateOfferInput) => {
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await supabase
                .from('offers')
                .insert({
                    application_id: input.applicationId,
                    salary: input.salary,
                    currency: input.currency || 'USD',
                    start_date: input.startDate,
                    created_by: user.id,
                    status: 'sent',
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['offers'] });
        },
    });

    // Respond to offer (Candidate)
    const respondMutation = useMutation({
        mutationFn: async ({ offerId, response }: { offerId: string; response: 'accepted' | 'declined' }) => {
            const { error } = await supabase
                .from('offers')
                .update({
                    status: response,
                    responded_at: new Date().toISOString(),
                })
                .eq('id', offerId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['offers'] });
        },
    });

    // Expire offer (Employer)
    const expireMutation = useMutation({
        mutationFn: async (offerId: string) => {
            const { error } = await supabase
                .from('offers')
                .update({ status: 'expired' })
                .eq('id', offerId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['offers'] });
        },
    });

    return {
        offers: query.data || [],
        isLoading: query.isLoading,
        error: query.error,
        createOffer: createMutation.mutateAsync,
        isCreating: createMutation.isPending,
        respondToOffer: respondMutation.mutateAsync,
        isResponding: respondMutation.isPending,
        expireOffer: expireMutation.mutateAsync,
        isExpiring: expireMutation.isPending,
        refetch: query.refetch,
    };
}
