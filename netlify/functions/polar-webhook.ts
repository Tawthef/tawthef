import type { Handler, HandlerEvent } from '@netlify/functions';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method not allowed' };
    }

    let polarEvent: ReturnType<typeof validateEvent>;

    try {
        polarEvent = validateEvent(
            event.body ?? '',
            event.headers as Record<string, string>,
            process.env.POLAR_WEBHOOK_SECRET ?? ''
        );
    } catch (err) {
        if (err instanceof WebhookVerificationError) {
            console.error('[polar-webhook] Signature verification failed:', err.message);
            return { statusCode: 400, body: `Webhook Error: ${err.message}` };
        }
        console.error('[polar-webhook] Parse error:', err);
        return { statusCode: 400, body: 'Invalid webhook payload' };
    }

    console.log('[polar-webhook] Event:', polarEvent.type);

    try {
        if (polarEvent.type === 'order.paid') {
            const order = polarEvent.data;
            const meta = (order.metadata ?? {}) as Record<string, string>;
            const { organization_id, plan_type, duration_days, usage_limit } = meta;

            if (!organization_id || !plan_type) {
                console.error('[polar-webhook] Missing metadata on order', order.id);
                return { statusCode: 200, body: JSON.stringify({ received: true }) };
            }

            const durationDays = parseInt(duration_days || '30', 10);
            const usageLimit = parseInt(usage_limit || '1', 10);

            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + durationDays);

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
                    stripe_customer_id: order.customerId ?? null,
                    stripe_session_id: order.id,
                    stripe_subscription_id: order.id,
                    stripe_price_id: null,
                    billing_status: 'paid',
                    auto_renew: false,
                }, {
                    onConflict: 'organization_id,plan_type',
                });

            if (error) {
                console.error('[polar-webhook] Upsert error:', error);
            } else {
                console.log(`[polar-webhook] Subscription activated: org=${organization_id} plan=${plan_type} ends=${endDate.toISOString()}`);
            }
        }
    } catch (err: any) {
        console.error('[polar-webhook] Handler error:', err);
        return { statusCode: 500, body: 'Webhook handler error' };
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

export { handler };
