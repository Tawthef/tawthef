import type { Handler } from '@netlify/functions';

const handler: Handler = async () => {
    return {
        statusCode: 410,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            error: 'Stripe billing webhook is retired. Use /api/polar-webhook.',
        }),
    };
};

export { handler };
