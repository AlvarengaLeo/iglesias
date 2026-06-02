import { createSupabaseClient } from './createSupabaseClient.js';

// Cliente del CRM de iglesia. storageKey propio ('iglesia-auth') para que su
// sesión NO se mezcle con la del Backoffice (que usa 'eb-connect-auth').
export const supabase = createSupabaseClient({
  storageKey: 'iglesia-auth',
  clientInfo: 'iglesia-crm',
});

// Surface auth state changes in dev console for debugging unwanted logouts.
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    const info = session ? `user=${session.user.email}, expires_in=${session.expires_in}s` : 'no session';
    console.log(`[supabase auth] ${event} · ${info}`);
  });
}
