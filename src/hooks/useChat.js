// Hooks de chat: canales, mensajes (Realtime postgres_changes), no-leídos.
// La seguridad la da RLS (el suscriptor solo recibe filas permitidas).
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import {
  listChannels, listMessages, sendMessage as apiSend,
  markChannelRead, unreadSummary, listMessageAttachments,
} from '../api/chat.js';

export function useChatChannels(churchId) {
  const [channels, setChannels] = useState([]);
  const [unread, setUnread] = useState({ total: 0, byChannel: {} });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!churchId) return;
    try {
      const [chs, ur] = await Promise.all([listChannels(churchId), unreadSummary(churchId)]);
      setChannels(chs);
      const byChannel = {};
      for (const c of ur?.channels || []) byChannel[c.channel_id] = c.unread;
      setUnread({ total: ur?.total || 0, byChannel });
    } catch (e) {
      console.error('useChatChannels:', e);
    } finally {
      setLoading(false);
    }
  }, [churchId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { channels, unread, loading, refresh };
}

export function useChannelMessages(channelId) {
  const { user } = useAuth();
  const myUserId = user?.id;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const nameCache = useRef({}); // sender_church_user_id -> name
  const seen = useRef(new Set());

  const addMessages = useCallback((rows, position = 'append') => {
    setMessages((prev) => {
      const next = position === 'prepend' ? [...rows, ...prev] : [...prev, ...rows];
      // dedup por id preservando orden
      const out = [];
      const ids = new Set();
      for (const m of next) {
        if (ids.has(m.id)) continue;
        ids.add(m.id);
        out.push(m);
      }
      out.sort((a, b) => Number(a.id) - Number(b.id));
      return out;
    });
  }, []);

  // Carga inicial + marca leído
  useEffect(() => {
    if (!channelId) { setMessages([]); return; }
    let alive = true;
    setLoading(true);
    seen.current = new Set();
    listMessages(channelId, { limit: 40 })
      .then((rows) => {
        if (!alive) return;
        for (const r of rows) { seen.current.add(r.id); if (r.sender_church_user_id) nameCache.current[r.sender_church_user_id] = r.senderName; }
        setMessages(rows);
        setHasMore(rows.length === 40);
        const maxId = rows.length ? rows[rows.length - 1].id : null;
        if (maxId) markChannelRead(channelId, maxId).catch(() => {});
      })
      .catch((e) => console.error('listMessages:', e))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [channelId]);

  // Suscripción Realtime
  useEffect(() => {
    if (!channelId) return;
    const ch = supabase
      .channel(`eq-msgs-${channelId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const m = payload.new;
          if (seen.current.has(m.id)) return;
          seen.current.add(m.id);
          const senderName = m.sender_user_id === myUserId ? 'Tú' : (nameCache.current[m.sender_church_user_id] || '—');
          addMessages([{ ...m, senderName, attachments: [] }], 'append');
          markChannelRead(channelId, m.id).catch(() => {});
          // Los adjuntos viven en otra tabla; tráelos para este mensaje si los hay.
          listMessageAttachments(m.id).then((att) => {
            if (att.length) setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, attachments: att } : x)));
          }).catch(() => {});
        })
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const m = payload.new;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, body: m.body, edited_at: m.edited_at, deleted_at: m.deleted_at } : x)));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channelId, myUserId, addMessages]);

  const send = useCallback(async (body, attachments = null, mentions = null) => {
    if (!channelId) return;
    const hasAttach = !!(attachments && attachments.length);
    const text = (body || '').trim();
    if (!text && !hasAttach) return;
    const nonce = crypto.randomUUID();
    const res = await apiSend(channelId, text, {
      clientNonce: nonce,
      attachments: hasAttach ? attachments : null,
      mentions: mentions && mentions.length ? mentions : null,
    });
    // Append inmediato (dedup contra el echo de Realtime por id).
    if (res?.id && !seen.current.has(res.id)) {
      seen.current.add(res.id);
      addMessages([{
        id: res.id, public_id: res.public_id, body: text || null,
        sender_user_id: myUserId, created_at: res.created_at, senderName: 'Tú',
        attachments: hasAttach ? attachments : [],
      }], 'append');
    }
  }, [channelId, myUserId, addMessages]);

  const loadOlder = useCallback(async () => {
    if (!channelId || !messages.length) return;
    const oldest = messages[0].id;
    const older = await listMessages(channelId, { before: oldest, limit: 40 });
    for (const r of older) { seen.current.add(r.id); if (r.sender_church_user_id) nameCache.current[r.sender_church_user_id] = r.senderName; }
    if (older.length < 40) setHasMore(false);
    addMessages(older, 'prepend');
  }, [channelId, messages, addMessages]);

  // marca local de borrado (la UPDATE de Realtime también lo refleja)
  const markDeletedLocal = useCallback((id) => {
    setMessages((prev) => prev.map((x) => (x.id === id ? { ...x, body: null, deleted_at: new Date().toISOString(), attachments: [] } : x)));
  }, []);

  return { messages, loading, hasMore, send, loadOlder, markDeletedLocal };
}

// Presencia (quién está en línea) + typing efímero, vía Realtime broadcast/presence.
// Canal NO privado (topic con churchId+channelId); defensivo ante Realtime no disponible.
export function useChannelPresence(channelId, me) {
  const [online, setOnline] = useState(0);
  const [typing, setTyping] = useState([]);
  const chRef = useRef(null);
  const timers = useRef({});
  const lastSent = useRef(0);

  useEffect(() => {
    if (!channelId || !me?.id) return;
    let ch;
    try {
      ch = supabase.channel(`eq-pres-${channelId}`, { config: { presence: { key: me.id } } });
      ch.on('presence', { event: 'sync' }, () => {
        try { setOnline(Object.keys(ch.presenceState()).length); } catch { /* noop */ }
      });
      ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload || payload.id === me.id) return;
        setTyping((prev) => (prev.includes(payload.name) ? prev : [...prev, payload.name]));
        clearTimeout(timers.current[payload.id]);
        timers.current[payload.id] = setTimeout(
          () => setTyping((prev) => prev.filter((n) => n !== payload.name)), 3000);
      });
      ch.subscribe((status) => { if (status === 'SUBSCRIBED') ch.track({ id: me.id, name: me.name }); });
      chRef.current = ch;
    } catch { /* realtime unavailable */ }
    return () => { try { if (ch) supabase.removeChannel(ch); } catch { /* noop */ } };
  }, [channelId, me?.id, me?.name]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current < 1500) return;
    lastSent.current = now;
    try { chRef.current?.send({ type: 'broadcast', event: 'typing', payload: { id: me?.id, name: me?.name } }); } catch { /* noop */ }
  }, [me?.id, me?.name]);

  return { online, typing, notifyTyping };
}
