import type { Handler, HandlerEvent } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2026-02-25.clover',
});

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const PLAN_DURATION: Record<string, number> = {
    job_slot_basic: 30,
    job_slot_pro: 90,
    resume_search: 30,
};
const PLAN_USAGE_LIMIT: Record<string, number> = {
    job_slot_basic: 1,
    job_slot_pro: 10,
    resume_search: 999,
};

const handler: Handler = async (event: HandlerEvent) => {
    // Stripe requires the raw body for signature verification
    const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    let stripeEvent: Stripe.Event;

    try {
        stripeEvent = stripe.webhooks.constructEvent(
            event.body || '',
            sig || '',
            webhookSecret
        );
    } catch (err: any) {
        console.error('[stripe-webhook] Signature verification failed:', err.message);
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    console.log('[stripe-webhook] Event:', stripeEvent.type);

    try {
        switch (stripeEvent.type) {

            // ── Payment Completed ───────────────────────────────────────────
            case 'checkout.session.completed': {
                const session = stripeEvent.data.object as Stripe.Checkout.Session;
                const { organization_id, plan_type, usage_limit, duration_days } = session.metadata || {};

                if (!organization_id || !plan_type) {
                    console.error('[stripe-webhook] Missing metadata on session', session.id);
                    break;
                }

                const durationDays = parseInt(duration_days || String(PLAN_DURATION[plan_type] || 30), 10);
                const usageLimit = parseInt(usage_limit || String(PLAN_USAGE_LIMIT[plan_type] || 1), 10);

                const startDate = new Date();
                const endDate = new Date();
                endDate.setDate(endDate.getDate() + durationDays);

                // Upsert subscription (match on org + plan_type to allow re-purchase)
                const { error } = await supabase
                    .from('subscriptions')
                    .upsert({
                        organization_id,
                        plan_type,
                        start_date: startDate.toISOString(),
                        end_date: endDate.toISOString(),
                        is_active: true,
                        usage_limit: usageLimit,
                        usage_used: 0,
                        stripe_customer_id: session.customer as string,
                        stripe_session_id: session.id,
                        stripe_price_id: (session.line_items as any)?.[0]?.price?.id || null,
                        billing_status: 'active',
                        auto_renew: false,
                    }, {
                        onConflict: 'organization_id,plan_type',
                    });

                if (error) console.error('[stripe-webhook] Upsert error:', error);
                else console.log(`[stripe-webhook] Subscription activated: org=${organization_id} plan=${plan_type} ends=${endDate.toISOString()}`);
                break;
            }

            // ── Invoice Paid (recurring renewal) ───────────────────────────
            case 'invoice.payment_succeeded': {
                const invoice = stripeEvent.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                if (!customerId) break;

                // Find existing subscription for this customer
                const { data: sub } = await supabase
                    .from('subscriptions')
                    .select('id, plan_type, usage_limit')
                    .eq('stripe_customer_id', customerId)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (!sub) { console.log('[stripe-webhook] No sub found for customer', customerId); break; }

                const durationDays = PLAN_DURATION[sub.plan_type] || 30;
                const newEndDate = new Date();
                newEndDate.setDate(newEndDate.getDate() + durationDays);

                const { error } = await supabase
                    .from('subscriptions')
                    .update({
                        end_date: newEndDate.toISOString(),
                        is_active: true,
                        usage_used: 0,
                        billing_status: 'active',
                    })
                    .eq('id', sub.id);

                if (error) console.error('[stripe-webhook] Renewal error:', error);
                else console.log('[stripe-webhook] Subscription renewed:', sub.id);
                break;
            }

            // ── Subscription Canceled ───────────────────────────────────────
            case 'customer.subscription.deleted': {
                const sub = stripeEvent.data.object as Stripe.Subscription;
                const customerId = sub.customer as string;

                const { error } = await supabase
                    .from('subscriptions')
                    .update({ is_active: false, billing_status: 'canceled' })
                    .eq('stripe_customer_id', customerId);

                if (error) console.error('[stripe-webhook] Cancel error:', error);
                else console.log('[stripe-webhook] Subscription canceled for customer:', customerId);
                break;
            }

            // ── Payment Failed ──────────────────────────────────────────────
            case 'invoice.payment_failed': {
                const invoice = stripeEvent.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                const { error } = await supabase
                    .from('subscriptions')
                    .update({ billing_status: 'past_due' })
                    .eq('stripe_customer_id', customerId);

                if (error) console.error('[stripe-webhook] past_due update error:', error);
                else console.log('[stripe-webhook] Payment failed, marked past_due:', customerId);
                break;
            }

            default:
                console.log('[stripe-webhook] Unhandled event type:', stripeEvent.type);
        }
    } catch (err: any) {
        console.error('[stripe-webhook] Handler error:', err);
        return { statusCode: 500, body: 'Webhook handler error' };
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

export { handler };
