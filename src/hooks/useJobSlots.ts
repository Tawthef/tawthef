import { useSubscription } from './useSubscription';

/**
 * Hook to manage job posting slots
 */
export function useJobSlots() {
    const { subscriptions, isLoading } = useSubscription();

    // Find active job posting subscription
    const jobPostingSubscription = subscriptions.find(
        sub => sub.plans?.type === 'job_posting'
    );

    const hasAvailableSlots = (jobPostingSubscription?.remaining_slots || 0) > 0;
    const remainingSlots = jobPostingSubscription?.remaining_slots || 0;
    const totalSlots = jobPostingSubscription?.plans?.job_slots || 0;
    const expiresAt = jobPostingSubscription?.end_date;

    return {
        hasAvailableSlots,
        remainingSlots,
        totalSlots,
        expiresAt,
        isLoading,
        subscription: jobPostingSubscription,
    };
}
