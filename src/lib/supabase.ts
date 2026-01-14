import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Log what values we're getting
console.log('[Supabase] Config check:', {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
    keyPresent: !!supabaseAnonKey,
});

// Fatal error if using placeholder values
if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
        '[Supabase] ❌ FATAL: Missing environment variables!\n' +
        'Ensure .env.local exists with:\n' +
        '  VITE_SUPABASE_URL=https://your-project.supabase.co\n' +
        '  VITE_SUPABASE_ANON_KEY=your-anon-key\n' +
        'Then RESTART the dev server (npm run dev)'
    );
}

if (supabaseUrl?.includes('placeholder')) {
    console.error(
        '[Supabase] ❌ FATAL: Placeholder URL detected!\n' +
        'Auth requests will fail. Check .env.local and restart dev server.'
    );
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);

// Log successful initialization
if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
    console.log('[Supabase] ✅ Client initialized with project:', supabaseUrl.split('.')[0].replace('https://', ''));
}
