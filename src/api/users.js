import { supabase } from '../lib/supabase.js';

// List all church_users (active + inactive) for the current church.
// RLS scoped to current user's churches.
export async function listChurchUsers(churchId) {
  const { data, error } = await supabase
    .from('church_users')
    .select('id, user_id, church_id, email_snapshot, full_name, role, is_active, invited_at, joined_at, last_seen_at, created_at')
    .eq('church_id', churchId)
    .order('joined_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Change a church_user's role. Only admin can do this (enforced by RLS).
export async function updateUserRole(churchUserId, role) {
  const valid = ['admin', 'pastor', 'treasurer', 'secretary', 'leader', 'viewer', 'servidor'];
  if (!valid.includes(role)) throw new Error('Rol inválido: ' + role);

  const { data, error } = await supabase
    .from('church_users')
    .update({ role })
    .eq('id', churchUserId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Activate or deactivate a church_user. Only admin (enforced by RLS).
export async function setUserActive(churchUserId, isActive) {
  const { data, error } = await supabase
    .from('church_users')
    .update({ is_active: isActive })
    .eq('id', churchUserId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Invita un nuevo miembro a la iglesia. Llama a la Edge Function `invite-user`
// que:
//   1. Valida el JWT del caller
//   2. Verifica que el caller sea admin de la iglesia
//   3. Inserta church_invitations
//   4. Dispara el email de invitación via SMTP nativo de Supabase Auth
//
// Errores comunes:
//   - invalid_email / invalid_role / invalid_church_id
//   - forbidden (caller no es admin)
//   - admin_role_blocked (no se permite invitar admins desde la UI)
//   - invitation_already_pending
//   - user_already_exists
//   - auth_invite_failed (dominio rechazado, SMTP no configurado, etc.)
export async function inviteUser({ email, role, churchId, fullName, personId }) {
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: {
      email,
      role,
      church_id: churchId,
      full_name: fullName || null,
      person_id: personId || null,
    },
  });
  if (error) {
    // El cliente envuelve non-2xx en FunctionsHttpError; intentar leer el body real.
    let detail = error.message;
    if (error.context?.response) {
      try {
        const txt = await error.context.response.text();
        const parsed = JSON.parse(txt);
        detail = parsed.message || parsed.error || txt;
      } catch { /* keep error.message */ }
    }
    throw new Error(detail);
  }
  return data;
}

// Human-friendly role label in Spanish.
export const roleLabel = (role) =>
  ({
    admin: 'Admin',
    pastor: 'Pastor',
    treasurer: 'Tesorero',
    secretary: 'Secretaria',
    leader: 'Líder',
    viewer: 'Lector',
    servidor: 'Servidor',
  }[role] || role || '—');

// Badge tone per role (for consistent coloring).
export const roleTone = (role) =>
  ({
    admin: 'coffee',
    pastor: 'coffee',
    treasurer: 'navy',
    secretary: 'info',
    leader: 'muted',
    viewer: 'muted',
    servidor: 'success',
  }[role] || 'muted');
