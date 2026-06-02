// Notificaciones internas del módulo Equipos. Lectura vía tabla (RLS: solo las
// propias); marcar leído vía RPCs SECURITY DEFINER.
import { supabase } from '../lib/supabase.js';

export async function listNotifications(churchId, { limit = 30 } = {}) {
  const { data, error } = await supabase
    .from('service_notifications')
    .select('id, type, title_key, params, status, deep_link, created_at, read_at')
    .eq('church_id', churchId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id) {
  const { error } = await supabase.rpc('rpc_notification_mark_read', { p_notification_id: id });
  if (error) throw error;
}

export async function markAllNotificationsRead(churchId) {
  const { error } = await supabase.rpc('rpc_notifications_mark_all_read', { p_church_id: churchId });
  if (error) throw error;
}
