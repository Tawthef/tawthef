import type { Handler, HandlerEvent } from '@netlify/functions';
import { Polar, ServerSandbox, ServerProduction } from '@polar-sh/sdk';
import { createClient } from '@supabase/supabase-js';

const polar = new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN ?? '',
    server: process.env.POLAR_SERVER === 'sandbox' ? ServerSandbox : ServerProduction,
});

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Keys = plan slugs from the plans table (sent by Pricing.tsx via plan.slug)
// planType = value stored in subscriptions.plan_type
const PLANS: Record<string, { productEnvKey: string; durationDays: number; usageLimit: number; planType: string }> = {
    'starter-job-slot': { productEnvKey: 'POLAR_PRODUCT_JOB_SLOT_BASIC',  durationDays: 30,  usageLimit: 1,   planType: 'job_slot_basic' },
    'growth-job-slots': { productEnvKey: 'POLAR_PRODUCT_JOB_SLOT_PRO',    durationDays: 90,  usageLimit: 10,  planType: 'job_slot_pro'   },
    'resume-search':    { productEnvKey: 'POLAR_PRODUCT_RESUME_SEARCH',   durationDays: 30,  usageLimit: 999, planType: 'resume_search'  },
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
        const token = (event.headers.authorization || '').replace('Bearer ', '');
        if (!token) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Missing token' }) };

        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Invalid token' }) };

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

        const { plan_type } = JSON.parse(event.body || '{}');
        const plan = PLANS[plan_type];
        if (!plan) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid plan_type' }) };

        const productId = process.env[plan.productEnvKey];
        if (!productId) {
            return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: `Product not configured: ${plan.productEnvKey}` }) };
        }

        const origin = event.headers.origin || event.headers.referer?.replace(/\/$/, '') || 'http://localhost:8888';
        const baseUrl = origin.includes('localhost') ? 'http://localhost:8888' : origin;

        const checkout = await polar.checkouts.create({
            products: [productId],
            successUrl: `${baseUrl}/payment/success`,
            cancelUrl: `${baseUrl}/payment/cancel`,
            customerEmail: user.email,
            metadata: {
                organization_id: profile.organization_id,
                plan_type: plan.planType,   // job_slot_basic | job_slot_pro | resume_search
                user_id: user.id,
                duration_days: String(plan.durationDays),
                usage_limit: String(plan.usageLimit),
            },
        });

        return {
            statusCode: 200,
            headers: CORS,
            body: JSON.stringify({ url: checkout.url }),
        };

    } catch (err: any) {
        // Extract the most useful error message from Polar SDK errors
        const message = err?.message
            || err?.error?.detail
            || err?.error?.message
            || (typeof err?.body === 'string' ? err.body : JSON.stringify(err?.body))
            || 'Unknown error';
        console.error('[create-checkout-session] Error:', message, err);
        return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: message }) };
    }
};

export { handler };
