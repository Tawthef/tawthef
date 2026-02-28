import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

/**
 * Shared hook to update application status via server-side RPC.
 * Enforces transition rules and logs to audit history.
 */
export function useUpdateApplicationStatus() {
    const { user } = useAuth();
    const { profile } = useProfile();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const mutation = useMutation({
        mutationFn: async ({ applicationId, newStatus }: { applicationId: string; newStatus: string }) => {
            const { data, error } = await supabase
                .rpc('update_application_status', {
                    p_app_id: applicationId,
                    p_new_status: newStatus,
                });

            if (error) {
                // Parse RPC error for user-friendly messages
                const msg = error.message || '';
                if (msg.includes('FORBIDDEN')) {
                    throw new Error('You do not have permission to perform this action.');
                } else if (msg.includes('TERMINAL_STATUS')) {
                    throw new Error('This application is already in a final state.');
                } else if (msg.includes('INVALID_STATUS')) {
                    throw new Error('Invalid status transition.');
                } else {
                    throw new Error(msg || 'Failed to update status.');
                }
            }

            return data;
        },
        onSuccess: (_data, variables) => {
            toast({
                title: 'Status Updated',
                description: `Application moved to "${formatStatus(variables.newStatus)}".`,
            });
            // Invalidate all application-related queries
            queryClient.invalidateQueries({ queryKey: ['employer-applications'] });
            queryClient.invalidateQueries({ queryKey: ['agency-applications'] });
            queryClient.invalidateQueries({ queryKey: ['technical-reviews'] });
            queryClient.invalidateQueries({ queryKey: ['job-report'] });
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
        onError: (error: Error) => {
            toast({
                title: 'Action Failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    return {
        updateStatus: mutation.mutateAsync,
        isUpdating: mutation.isPending,
    };
}

/**
 * Returns allowed next statuses for a given current status and role.
 */
export function getAllowedTransitions(currentStatus: string, role: string): Array<{ status: string; label: string; variant: 'default' | 'destructive' | 'outline' }> {
    const transitions: Array<{ status: string; label: string; variant: 'default' | 'destructive' | 'outline' }> = [];

    if (currentStatus === 'hired' || currentStatus === 'rejected') {
        return []; // Terminal
    }

    if (role === 'admin') {
        // Admin can do all forward transitions
        const allForward: Record<string, Array<{ s: string; l: string }>> = {
            applied: [{ s: 'agency_shortlisted', l: 'Agency Shortlist' }, { s: 'hr_shortlisted', l: 'HR Shortlist' }],
            agency_shortlisted: [{ s: 'hr_shortlisted', l: 'HR Shortlist' }],
            hr_shortlisted: [{ s: 'technical_shortlisted', l: 'Send to Technical' }],
            technical_shortlisted: [{ s: 'interview', l: 'Approve for Interview' }],
            interview: [{ s: 'offer', l: 'Send Offer' }],
            offer: [{ s: 'hired', l: 'Mark Hired' }],
        };
        const fwd = allForward[currentStatus] || [];
        fwd.forEach(f => transitions.push({ status: f.s, label: f.l, variant: 'default' }));
        transitions.push({ status: 'rejected', label: 'Reject', variant: 'destructive' });
        return transitions;
    }

    if (role === 'agency') {
        if (currentStatus === 'applied') {
            transitions.push({ status: 'agency_shortlisted', label: 'Shortlist for Client', variant: 'default' });
        }
    }

    if (role === 'employer') {
        if (currentStatus === 'applied' || currentStatus === 'agency_shortlisted') {
            transitions.push({ status: 'hr_shortlisted', label: 'HR Shortlist', variant: 'default' });
        }
        if (currentStatus === 'hr_shortlisted') {
            transitions.push({ status: 'technical_shortlisted', label: 'Send to Technical', variant: 'default' });
        }
        if (currentStatus === 'interview') {
            transitions.push({ status: 'offer', label: 'Send Offer', variant: 'default' });
        }
        if (currentStatus === 'offer') {
            transitions.push({ status: 'hired', label: 'Mark Hired', variant: 'default' });
        }
        // Employer can reject from any non-terminal status
        transitions.push({ status: 'rejected', label: 'Reject', variant: 'destructive' });
    }

    if (role === 'expert') {
        if (currentStatus === 'technical_shortlisted') {
            transitions.push({ status: 'interview', label: 'Approve for Interview', variant: 'default' });
        }
        transitions.push({ status: 'rejected', label: 'Reject', variant: 'destructive' });
    }

    return transitions;
}

function formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
