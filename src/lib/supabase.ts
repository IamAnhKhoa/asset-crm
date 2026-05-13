import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Server-side client with service_role key (bypasses RLS)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
    global: {
        fetch: (url, options) => {
            return fetch(url, { ...options, cache: 'no-store' });
        },
    },
});

// Format helpers for compatibility with existing code
import { formatDateTime } from './date-utils';

export function formatTimestamp(date: Date): string {
    return formatDateTime(date);
}

export function toISOString(date: Date): string {
    return date.toISOString();
}
