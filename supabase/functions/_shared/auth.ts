// Shared auth helper for Edge Functions.
// - Verifies the caller's JWT (Authorization: Bearer <jwt>)
// - Returns:
//     callerClient   → supabase client scoped al caller (respeta RLS)
//     adminClient    → supabase client con service role (bypasea RLS)
//     callerUser     → auth.users row del caller
// - Lanza Response 401 si no hay JWT válido.

import { createClient, type SupabaseClient, type User } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from './cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

export interface AuthContext {
  callerClient: SupabaseClient;
  adminClient: SupabaseClient;
  callerUser: User;
  jwt: string;
}

export async function authenticate(req: Request): Promise<AuthContext | Response> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return jsonError(401, 'missing_authorization');
  }
  const jwt = authHeader.slice('Bearer '.length).trim();
  if (!jwt) {
    return jsonError(401, 'invalid_authorization');
  }

  // Client del caller (respeta RLS): pasamos su JWT en headers.
  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Admin client: solo para acciones SECURITY DEFINER-ish (invitar usuario,
  // crear filas que requieren bypass de RLS). Nunca devolver al frontend.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error } = await callerClient.auth.getUser(jwt);
  if (error || !userData?.user) {
    return jsonError(401, 'invalid_session');
  }

  return { callerClient, adminClient, callerUser: userData.user, jwt };
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function jsonError(status: number, code: string, message?: string): Response {
  return jsonResponse(status, { error: code, message: message ?? code });
}
