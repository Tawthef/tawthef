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

// Map plan_type → { priceId, durationDays, usageLimit }
const PLANS: Record<string, { priceEnvKey: string; durationDays: number; usageLimit: number }> = {
    job_slot_basic: { priceEnvKey: 'STRIPE_PRICE_JOB_SLOT_BASIC', durationDays: 30, usageLimit: 1 },
    job_slot_pro: { priceEnvKey: 'STRIPE_PRICE_JOB_SLOT_PRO', durationDays: 90, usageLimit: 10 },
    resume_search: { priceEnvKey: 'STRIPE_PRICE_RESUME_SEARCH', durationDays: 30, usageLimit: 999 },
};

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
};

const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
    if (event.httpMethod !== 'POST') return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method not allowed' }) };

    try {
        // 1. Authenticate
        const token = (event.headers.authorization || '').replace('Bearer ', '');
        if (!token) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Missing token' }) };

        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid token' }) };

        // 2. Get profile + org
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, organization_id, full_name')
            .eq('id', user.id)
            .single();

        if (!profile || !['employer', 'agency', 'admin'].includes(profile.role)) {
            return { statusCode: 403, headers: CORS, body: JSON.stringify({ error: 'Only recruiters can purchase plans' }) };
        }
        if (!profile.organization_id) {
            return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'No organization found' }) };
        }

        // 3. Get plan
        const { plan_type } = JSON.parse(event.body || '{}');
        const plan = PLANS[plan_type];
        if (!plan) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid plan_type' }) };

        const priceId = process.env[plan.priceEnvKey];
        if (!priceId) {
            return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: `Price not configured: ${plan.priceEnvKey}` }) };
        }

        // 4. Find or create Stripe customer
        let customerId: string | undefined;
        const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('organization_id', profile.organization_id)
            .not('stripe_customer_id', 'is', null)
            .limit(1)
            .maybeSingle();

        if (existingSub?.stripe_customer_id) {
            customerId = existingSub.stripe_customer_id;
        } else {
            const customer = await stripe.customers.create({
                email: user.email,
                name: profile.full_name || user.email,
                metadata: { organization_id: profile.organization_id, user_id: user.id },
            });
            customerId = customer.id;
        }

        // 5. Determine success/cancel URLs
        const origin = event.headers.origin || event.headers.referer?.replace(/\/$/, '') || 'http://localhost:8888';
        const baseUrl = origin.includes('localhost') ? 'http://localhost:8888' : origin;

        // 6. Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            mode: 'payment',                    // one-time payment
            success_url: `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/payment/cancel`,
            metadata: {
                organization_id: profile.organization_id,
                plan_type,
                user_id: user.id,
                duration_days: String(plan.durationDays),
                usage_limit: String(plan.usageLimit),
            },
            client_reference_id: profile.organization_id,
        });

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ url: session.url, session_id: session.id }),
        };

    } catch (err: any) {
        console.error('[create-checkout-session]', err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: err.message }) };
    }
};

export { handler };
