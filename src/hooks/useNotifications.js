// Hook de notificaciones: lista + no-leídos + Realtime (filtra por recipient).
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { listNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications.js';

export function useNotifications(churchId) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  const refresh = useCallback(async () => {
    if (!churchId) { setItems([]); return; }
    try { setItems(await listNotifications(churchId)); } catch (e) { console.error('useNotifications:', e); }
  }, [churchId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: refresca al recibir/actualizar notificaciones propias.
  useEffect(() => {
    if (!churchId || !user?.id) return;
    const ch = supabase
      .channel(`eq-notif-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'service_notifications', filter: `recipient_user_id=eq.${user.id}` },
        () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [churchId, user?.id, refresh]);

  const unread = items.filter((n) => n.status === 'unread').length;
  const markRead = useCallback(async (id) => { try { await markNotificationRead(id); refresh(); } catch (e) { console.error(e); } }, [refresh]);
  const markAll = useCallback(async () => { try { await markAllNotificationsRead(churchId); refresh(); } catch (e) { console.error(e); } }, [churchId, refresh]);

  return { items, unread, refresh, markRead, markAll };
}
