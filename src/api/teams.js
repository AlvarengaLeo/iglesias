// API del módulo "Equipos" (Teams). Lecturas vía supabase-js (RLS aplica),
// escrituras de estado vía RPCs SECURITY DEFINER (F2). Cada llamada pasa churchId.
import { supabase } from '../lib/supabase.js';

// ----- Catálogo de estados de asignación (para badges) -----
export const ASSIGNMENT_STATUS = {
  pending:           { key: 'status.pending',           tone: 'warning' },
  confirmed:         { key: 'status.confirmed',         tone: 'success' },
  declined:          { key: 'status.declined',          tone: 'error' },
  needs_replacement: { key: 'status.needs_replacement', tone: 'warning' },
  replaced:          { key: 'status.replaced',          tone: 'muted' },
  cancelled:         { key: 'status.cancelled',         tone: 'muted' },
};

export const SERVICE_TYPES = [
  'culto_general', 'servicio_hispano', 'servicio_ingles', 'jovenes',
  'ninos', 'estudio_biblico', 'vigilia', 'ensayo', 'evento_especial',
];

// ============================ Servicios (eventos) ============================

export async function listServiceEvents(churchId, { from = null, to = null, limit = 200, order = 'asc' } = {}) {
  let q = supabase
    .from('service_events')
    .select('id, title, service_type, language, start_datetime, end_datetime, location, notes, status, assignments:service_assignments(status, team_id)')
    .eq('church_id', churchId)
    .is('deleted_at', null)
    .order('start_datetime', { ascending: order !== 'desc' })
    .limit(limit);
  if (from) q = q.gte('start_datetime', from);
  if (to) q = q.lte('start_datetime', to);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// Actualiza un servicio (managers, vía RLS se_update). Usado por editar/cancelar.
export async function updateServiceEvent(id, patch) {
  const clean = { ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('service_events')
    .update(clean)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createServiceEvent({
  churchId, title, serviceType = 'culto_general', language = null,
  start, end = null, location = null, notes = null, status = 'scheduled',
}) {
  const { data, error } = await supabase.rpc('rpc_create_service_event', {
    p_church_id: churchId,
    p_title: title,
    p_service_type: serviceType,
    p_language: language,
    p_start: start,
    p_end: end,
    p_location: location,
    p_notes: notes,
    p_status: status,
  });
  if (error) throw error;
  return data; // event id (uuid)
}

export async function getServiceDetail(serviceEventId) {
  const { data, error } = await supabase.rpc('rpc_get_service_detail', {
    p_service_event_id: serviceEventId,
  });
  if (error) throw error;
  return data; // { id, title, ..., assignments: [...] }
}

// ============================ Equipos / posiciones ============================

export async function listTeams(churchId) {
  const { data, error } = await supabase
    .from('service_teams')
    .select(`
      id, name, description, leader_person_id, is_active,
      positions:service_positions(id, name, sort_order, is_active),
      members:service_team_members(id, person_id, team_role, is_active)
    `)
    .eq('church_id', churchId)
    .is('deleted_at', null)
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getTeam(teamId) {
  const { data, error } = await supabase
    .from('service_teams')
    .select(`
      id, church_id, name, description, leader_person_id, is_active,
      positions:service_positions(id, name, description, sort_order, is_active),
      members:service_team_members(
        id, person_id, team_role, is_active,
        person:people(id, first_name, last_name, organization_name)
      )
    `)
    .eq('id', teamId)
    .single();
  if (error) throw error;
  return data;
}

export async function createTeam({ churchId, name, description = null, leaderPersonId = null }) {
  const { data, error } = await supabase
    .from('service_teams')
    .insert({ church_id: churchId, name, description, leader_person_id: leaderPersonId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTeam(teamId, patch) {
  const { data, error } = await supabase
    .from('service_teams')
    .update(patch)
    .eq('id', teamId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createPosition({ churchId, teamId, name, description = null, sortOrder = 0 }) {
  const { data, error } = await supabase
    .from('service_positions')
    .insert({ church_id: churchId, team_id: teamId, name, description, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function addTeamMember({ churchId, teamId, personId, teamRole = 'member' }) {
  const { data, error } = await supabase
    .from('service_team_members')
    .insert({ church_id: churchId, team_id: teamId, person_id: personId, team_role: teamRole })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setTeamMemberActive(memberId, isActive) {
  const { data, error } = await supabase
    .from('service_team_members')
    .update({ is_active: isActive })
    .eq('id', memberId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ============================ Asignaciones ============================

export async function assignPerson({ churchId, serviceEventId, positionId, personId, arrivalTime = null, notes = null }) {
  const { data, error } = await supabase.rpc('rpc_assign_person', {
    p_church_id: churchId,
    p_service_event_id: serviceEventId,
    p_position_id: positionId,
    p_person_id: personId,
    p_arrival_time: arrivalTime,
    p_notes: notes,
  });
  if (error) throw error;
  return data; // assignment id
}

// Servidor: confirma / declina / pide reemplazo (solo su propia asignación).
export async function respondAssignment({ assignmentId, response, message = null }) {
  const { data, error } = await supabase.rpc('rpc_respond_assignment', {
    p_assignment_id: assignmentId,
    p_response: response, // 'confirmed' | 'declined' | 'needs_replacement'
    p_message: message,
  });
  if (error) throw error;
  return data;
}

// Staff/líder: transición de estado (cancelar, etc.).
export async function assignmentTransition({ assignmentId, toStatus, reason = null }) {
  const { data, error } = await supabase.rpc('rpc_assignment_transition', {
    p_assignment_id: assignmentId,
    p_to_status: toStatus,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function fillReplacement({ assignmentId, newPersonId, arrivalTime = null }) {
  const { data, error } = await supabase.rpc('rpc_fill_replacement', {
    p_assignment_id: assignmentId,
    p_new_person_id: newPersonId,
    p_arrival_time: arrivalTime,
  });
  if (error) throw error;
  return data;
}

// ============================ Vistas del servidor / equipo ============================

export async function getMyServices(churchId) {
  const { data, error } = await supabase.rpc('rpc_get_my_services', { p_church_id: churchId });
  if (error) throw error;
  return data || [];
}

export async function getTeamCalendar(churchId, teamId, { from = null, to = null } = {}) {
  const params = { p_church_id: churchId, p_team_id: teamId };
  if (from) params.p_from = from;
  if (to) params.p_to = to;
  const { data, error } = await supabase.rpc('rpc_get_team_calendar', params);
  if (error) throw error;
  return data || [];
}

export async function seedServingDefaults(churchId) {
  const { data, error } = await supabase.rpc('rpc_seed_serving_defaults', { p_church_id: churchId });
  if (error) throw error;
  return data;
}

// ----- helper de nombre de persona -----
export const personDisplayName = (p) =>
  p ? (p.organization_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || '—') : '—';
