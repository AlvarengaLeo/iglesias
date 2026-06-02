// Edge Function: invite-user
//
// Origina una invitación a un nuevo miembro de la iglesia.
//
// Flow:
//   1. Valida JWT del caller.
//   2. Verifica que el caller sea admin de la church_id objetivo (vía RPC user_role_in_church).
//   3. Valida email + role (whitelist según rol del caller).
//   4. Inserta church_invitations row (token, expires_at +7d, invited_by).
//   5. Llama auth.admin.inviteUserByEmail() — el SMTP nativo de Supabase
//      envía el email. NO requiere Resend.
//   6. Retorna { invitation_id, expires_at }.
//
// Errores:
//   401 → missing/invalid auth
//   400 → email inválido, role inválido, body malformado
//   403 → caller no es admin de la iglesia objetivo
//   409 → ya existe invitación pendiente para ese email en esa iglesia
//   500 → fallo en Supabase Auth admin

import { authenticate, jsonResponse, jsonError } from '../_shared/auth.ts';
import { handlePreflight } from '../_shared/cors.ts';

interface InviteBody {
  email?: string;
  role?: string;
  church_id?: string;
  full_name?: string | null;
  person_id?: string | null;
}

const ROLE_VALUES = ['admin', 'pastor', 'treasurer', 'secretary', 'leader', 'viewer', 'servidor'] as const;
const ROLES_NON_ADMIN = ROLE_VALUES.filter((r) => r !== 'admin');

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  if (req.method !== 'POST') {
    return jsonError(405, 'method_not_allowed');
  }

  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const { callerClient, adminClient, callerUser } = auth;

  let body: InviteBody;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'invalid_json');
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const role = (body.role ?? '').trim();
  const churchId = (body.church_id ?? '').trim();
  const fullName = body.full_name?.trim() || null;
  const personId = (body.person_id ?? '').trim() || null;

  if (!email || !EMAIL_RX.test(email)) {
    return jsonError(400, 'invalid_email');
  }
  if (!churchId || !UUID_RX.test(churchId)) {
    return jsonError(400, 'invalid_church_id');
  }
  if (!ROLE_VALUES.includes(role as typeof ROLE_VALUES[number])) {
    return jsonError(400, 'invalid_role', `role must be one of: ${ROLE_VALUES.join(', ')}`);
  }
  if (personId && !UUID_RX.test(personId)) {
    return jsonError(400, 'invalid_person_id');
  }
  // Un servidor (voluntario) debe vincularse a una ficha de persona para ver "Mi servicio".
  if (role === 'servidor' && !personId) {
    return jsonError(400, 'person_required_for_servidor', 'un servidor debe vincularse a una persona');
  }

  // Permiso: caller debe ser admin de la church objetivo.
  const { data: callerRole, error: roleErr } = await callerClient.rpc('user_role_in_church', {
    p_church_id: churchId,
  });
  if (roleErr) {
    return jsonError(500, 'role_check_failed', roleErr.message);
  }
  if (callerRole !== 'admin') {
    return jsonError(403, 'forbidden', 'solo admin puede invitar usuarios');
  }

  // Si se vincula una persona, validar que pertenezca a la iglesia objetivo.
  if (personId) {
    const { data: person } = await adminClient
      .from('people')
      .select('id')
      .eq('id', personId)
      .eq('church_id', churchId)
      .is('deleted_at', null)
      .maybeSingle();
    if (!person?.id) {
      return jsonError(400, 'person_not_in_church', 'la persona no existe en esta iglesia');
    }
  }

  // Restricción adicional: no permitir invitar como 'admin' a menos que tenga sentido en el negocio.
  // Por ahora bloqueamos creación de admins via UI; admins solo se crean por proceso administrativo.
  if (role === 'admin') {
    return jsonError(403, 'admin_role_blocked', 'no se pueden invitar admins desde la UI; contactar soporte');
  }
  // (lista efectiva queda en ROLES_NON_ADMIN)
  if (!ROLES_NON_ADMIN.includes(role as typeof ROLES_NON_ADMIN[number])) {
    return jsonError(400, 'invalid_role');
  }

  // ¿Ya existe invitación pendiente?
  const { data: existing } = await adminClient
    .from('church_invitations')
    .select('id')
    .eq('church_id', churchId)
    .filter('email', 'ilike', email)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .maybeSingle();
  if (existing?.id) {
    return jsonError(409, 'invitation_already_pending');
  }

  // Insertar invitación.
  const { data: invitation, error: insErr } = await adminClient
    .from('church_invitations')
    .insert({
      church_id: churchId,
      email,
      role,
      invited_by: callerUser.id,
      person_id: personId,
    })
    .select('id, token, expires_at')
    .single();

  if (insErr || !invitation) {
    return jsonError(500, 'invitation_insert_failed', insErr?.message);
  }

  // Enviar invite via Supabase Auth (SMTP nativo).
  const redirectTo = (req.headers.get('origin') ?? 'http://localhost:5173') + '/#accept-invite';
  const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      invitation_token: invitation.token,
      church_id: churchId,
      role,
      full_name: fullName,
    },
    redirectTo,
  });

  if (inviteErr) {
    // Marcar invitación como revoked para no dejar huérfanos sin email.
    await adminClient
      .from('church_invitations')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', invitation.id);

    // Si el error es "User already registered", devolver código específico.
    const msg = inviteErr.message ?? '';
    if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
      return jsonError(409, 'user_already_exists', msg);
    }
    return jsonError(500, 'auth_invite_failed', msg);
  }

  return jsonResponse(200, {
    invitation_id: invitation.id,
    expires_at: invitation.expires_at,
    email,
    role,
  });
});
