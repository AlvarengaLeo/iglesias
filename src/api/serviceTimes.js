import { supabase } from '../lib/supabase.js';

export const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export async function listServiceTimes(churchId, { activeOnly = false } = {}) {
  let q = supabase
    .from('service_times')
    .select('*')
    .eq('church_id', churchId)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createServiceTime(churchId, payload) {
  const { data, error } = await supabase
    .from('service_times')
    .insert({
      church_id: churchId,
      day_of_week: payload.day_of_week,
      start_time: payload.start_time,
      duration_min: payload.duration_min || 90,
      meeting_type: payload.meeting_type,
      location: payload.location || null,
      address: payload.address || null,
      is_active: payload.is_active !== false,
      sort_order: payload.sort_order || 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateServiceTime(id, patch) {
  const { data, error } = await supabase
    .from('service_times')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteServiceTime(id) {
  // Soft delete via is_active=false
  return updateServiceTime(id, { is_active: false });
}
