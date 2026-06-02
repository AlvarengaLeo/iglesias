import { createSupabaseClient } from '../../lib/createSupabaseClient.js';

// Cliente exclusivo del Backoffice (EB Connect). storageKey propio
// ('eb-connect-auth') → sesión independiente del CRM de iglesia, aunque ambas
// apps corran en el mismo origen y apunten al mismo proyecto Supabase.
export const supabase = createSupabaseClient({
  storageKey: 'eb-connect-auth',
  clientInfo: 'eb-connect-backoffice',
});
