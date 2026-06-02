import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Faltan variables VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY en .env.local'
  );
}

// Fábrica de clientes Supabase. Cada app (CRM, Backoffice) crea su PROPIO cliente
// con un storageKey distinto para NO compartir la sesión en localStorage (mismo
// origen → mismo localStorage). Este módulo no instancia ningún cliente al cargarse:
// así cada página sólo crea el cliente que importa.
export function createSupabaseClient({ storageKey, clientInfo }) {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // NOTA: flowType: 'pkce' rompe sesiones implicit-flow existentes —
      // el SDK refresca el token antes de cada query buscando el code_verifier
      // que no existe, generando un loop de 13+ refresh por reload.
      // Default ('implicit') es estable para nuestro caso.
    },
    global: {
      headers: { 'X-Client-Info': clientInfo },
    },
  });
}
