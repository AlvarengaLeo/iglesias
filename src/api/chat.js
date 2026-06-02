// API de chat del módulo Equipos. Lecturas vía supabase-js (RLS aplica),
// escrituras vía RPCs SECURITY DEFINER (F2). Realtime se maneja en los hooks.
import { supabase } from '../lib/supabase.js';

const personName = (p) =>
  p ? (p.organization_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || '—') : '—';

// Lista de canales visibles para el usuario (RLS: miembro, o manager en grupos).
// Incluye los miembros (para nombrar DMs y el panel de info).
export async function listChannels(churchId) {
  const { data, error } = await supabase
    .from('chat_channels')
    .select(`
      id, room_type, name, team_id, service_event_id, position_id, updated_at,
      members:chat_channel_members(church_user_id, user_id, is_active,
        person:people(first_name, last_name, organization_name))
    `)
    .eq('church_id', churchId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Nombre a mostrar de un canal (resuelve DMs según el "otro" participante).
export function channelDisplayName(channel, myUserId) {
  if (channel.room_type === 'dm') {
    const other = (channel.members || []).find((m) => m.user_id !== myUserId);
    return other ? personName(other.person) : 'Mensaje directo';
  }
  return channel.name || 'Canal';
}

// Mensajes de un canal (keyset; ascending para mostrar). before = id límite (más viejos).
export async function listMessages(channelId, { before = null, limit = 40 } = {}) {
  let q = supabase
    .from('chat_messages')
    .select(`
      id, public_id, body, sender_user_id, sender_church_user_id, reply_to_message_id, edited_at, deleted_at, created_at,
      attachments:chat_attachments(id, storage_path, mime, size_bytes, width, height)
    `)
    .eq('channel_id', channelId)
    .order('id', { ascending: false })
    .limit(limit);
  if (before) q = q.lt('id', before);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data || []).slice().reverse(); // ascending

  // Resolver nombres de remitente (church_users.full_name || email).
  const ids = [...new Set(rows.map((r) => r.sender_church_user_id).filter(Boolean))];
  let nameMap = {};
  if (ids.length) {
    const { data: us } = await supabase
      .from('church_users')
      .select('id, full_name, email_snapshot')
      .in('id', ids);
    for (const u of us || []) nameMap[u.id] = u.full_name || (u.email_snapshot || '').split('@')[0];
  }
  return rows.map((r) => ({ ...r, senderName: nameMap[r.sender_church_user_id] || '—' }));
}

export async function sendMessage(channelId, body, { replyTo = null, clientNonce = null, mentions = null, attachments = null } = {}) {
  const { data, error } = await supabase.rpc('rpc_send_message', {
    p_channel_id: channelId,
    p_body: body,
    p_reply_to: replyTo,
    p_client_nonce: clientNonce,
    p_mentions: mentions,
    p_attachments: attachments,
  });
  if (error) throw error;
  return data; // { id, public_id, created_at, has_attachments }
}

// Sube un archivo al bucket privado chat-media. Path: {church}/chat/{channel}/{uuid}.{ext}
export async function uploadAttachment(churchId, channelId, file) {
  const ext = (file.name?.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${churchId}/chat/${channelId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('chat-media').upload(path, file, {
    contentType: file.type || 'application/octet-stream', upsert: false,
  });
  if (error) throw error;
  return { storage_path: path, mime: file.type || null, size_bytes: file.size || null, width: null, height: null, name: file.name };
}

// Signed URL temporal (bucket privado). TTL corto; re-firmar al renderizar.
export async function getSignedUrl(storagePath, expiresIn = 600) {
  const { data, error } = await supabase.storage.from('chat-media').createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function listMessageAttachments(messageId) {
  const { data } = await supabase
    .from('chat_attachments')
    .select('id, storage_path, mime, size_bytes, width, height')
    .eq('message_id', messageId);
  return data || [];
}

export async function markChannelRead(channelId, upTo = null) {
  const { error } = await supabase.rpc('rpc_mark_channel_read', {
    p_channel_id: channelId,
    p_up_to: upTo,
  });
  if (error) throw error;
}

export async function createOrGetDm(churchId, otherChurchUserId) {
  const { data, error } = await supabase.rpc('rpc_create_or_get_dm', {
    p_church_id: churchId,
    p_other_church_user_id: otherChurchUserId,
  });
  if (error) throw error;
  return data; // { channel_id, dm_key }
}

export async function unreadSummary(churchId) {
  const { data, error } = await supabase.rpc('rpc_unread_summary', { p_church_id: churchId });
  if (error) throw error;
  return data; // { total, channels: [{channel_id, unread}] }
}

export async function setChannelMuted(channelId, muted) {
  const { error } = await supabase.rpc('rpc_set_channel_muted', { p_channel_id: channelId, p_muted: muted });
  if (error) throw error;
}

export async function deleteMessage(messageId) {
  const { error } = await supabase.rpc('rpc_delete_message', { p_message_id: messageId });
  if (error) throw error;
}
