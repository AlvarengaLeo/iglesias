import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Faltan variables VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'iglesia-auth',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce',
  },
  global: {
    // Keep connection alive longer
    headers: { 'X-Client-Info': 'iglesia-crm' },
  },
});

// Surface auth state changes in dev console for debugging unwanted logouts.
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    const info = session ? `user=${session.user.email}, expires_in=${session.expires_in}s` : 'no session';
    console.log(`[supabase auth] ${event} · ${info}`);
  });
}
