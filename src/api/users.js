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
  const valid = ['admin', 'pastor', 'treasurer', 'secretary', 'leader', 'viewer'];
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

// STUB: invitar usuario por email. Edge Function `invite-user` se implementa en Fase 6/9.
// Por ahora solo registra el intent en consola para QA.
export async function inviteUserStub({ email, role }) {
  console.warn('[stub] inviteUser pendiente — Fase futura:', { email, role });
  return { stub: true };
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
  }[role] || 'muted');
