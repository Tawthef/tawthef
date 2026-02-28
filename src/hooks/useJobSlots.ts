import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useProfile } from './useProfile';
import { useCheckSubscription } from './useSubscription';

/**
 * Hook to manage job posting slots via server-side RPC enforcement.
 * Checks both job_slot_basic and job_slot_pro plans.
 */
export function useJobSlots() {
    const { profile } = useProfile();
    const queryClient = useQueryClient();

    // Check basic plan
    const { check: basicCheck, isLoading: basicLoading } = useCheckSubscription('job_slot_basic');
    // Check pro plan
    const { check: proCheck, isLoading: proLoading } = useCheckSubscription('job_slot_pro');

    // Combine: user has slots if either plan is valid with remaining usage
    const isLoading = basicLoading || proLoading;
    const hasAvailableSlots = basicCheck.is_valid || proCheck.is_valid;
    const remainingSlots = basicCheck.remaining_usage + proCheck.remaining_usage;
    const remainingDays = Math.max(basicCheck.remaining_days, proCheck.remaining_days);

    // Mutation to consume a slot via RPC
    const consumeMutation = useMutation({
        mutationFn: async () => {
            if (!profile?.organization_id) {
                throw new Error('No organization found');
            }

            const { data, error } = await supabase
                .rpc('consume_job_slot', { p_org_id: profile.organization_id });

            if (error) {
                // Surface the RPC error message
                throw new Error(error.message || 'Failed to consume job slot');
            }

            return data;
        },
        onSuccess: () => {
            // Invalidate subscription checks so UI updates
            queryClient.invalidateQueries({ queryKey: ['check-subscription'] });
        },
    });

    const consumeSlot = useCallback(async () => {
        return consumeMutation.mutateAsync();
    }, [consumeMutation]);

    return {
        hasAvailableSlots,
        remainingSlots,
        remainingDays,
        isLoading,
        consumeSlot,
        isConsuming: consumeMutation.isPending,
        consumeError: consumeMutation.error,
    };
}
