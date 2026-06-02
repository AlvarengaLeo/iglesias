import { supabase } from '../lib/supabase.js';
import { parseEmbed } from '../lib/embed.js';

// Admin CRUD for sermons. RLS enforces role IN ('admin','pastor','secretary').
// Soft delete via deleted_at. Media URLs validated against the embed whitelist.

function clean(v) {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

function validateMedia({ video_url, audio_url }) {
  if (video_url && !parseEmbed(video_url)) {
    throw new Error('Video URL is not a supported YouTube or Vimeo link.');
  }
  if (!video_url && !audio_url) {
    throw new Error('A sermon needs at least a video or audio URL.');
  }
}

export async function listSermons(churchId, { visibleOnly = false, series = null } = {}) {
  let q = supabase
    .from('sermons')
    .select('*')
    .eq('church_id', churchId)
    .is('deleted_at', null)
    .order('sermon_date', { ascending: false })
    .order('sort_order', { ascending: true });
  if (visibleOnly) q = q.eq('is_visible_on_portal', true);
  if (series) q = q.eq('series', series);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getSermon(id) {
  const { data, error } = await supabase.from('sermons').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createSermon(churchId, payload, createdByUserId) {
  const body = {
    video_url: clean(payload.video_url),
    audio_url: clean(payload.audio_url),
  };
  validateMedia(body);
  const { data, error } = await supabase
    .from('sermons')
    .insert({
      church_id: churchId,
      title: payload.title.trim(),
      speaker: clean(payload.speaker),
      series: clean(payload.series),
      scripture_reference: clean(payload.scripture_reference),
      sermon_date: payload.sermon_date || new Date().toISOString().split('T')[0],
      description: clean(payload.description),
      video_url: body.video_url,
      audio_url: body.audio_url,
      thumbnail_url: clean(payload.thumbnail_url),
      duration_seconds: payload.duration_seconds || null,
      is_visible_on_portal: !!payload.is_visible_on_portal,
      sort_order: payload.sort_order || 0,
      created_by: createdByUserId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSermon(id, patch) {
  if (patch.video_url !== undefined || patch.audio_url !== undefined) {
    validateMedia({ video_url: patch.video_url, audio_url: patch.audio_url });
  }
  const { data, error } = await supabase
    .from('sermons')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSermon(id) {
  return updateSermon(id, { deleted_at: new Date().toISOString() });
}

export async function setSermonVisibility(id, visible) {
  return updateSermon(id, { is_visible_on_portal: !!visible });
}
