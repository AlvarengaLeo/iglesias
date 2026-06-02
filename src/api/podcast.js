import { supabase } from '../lib/supabase.js';
import { parseEmbed } from '../lib/embed.js';

// Admin CRUD for podcast episodes. RLS enforces role IN ('admin','pastor','secretary').
// Soft delete via deleted_at. At least one platform/audio URL required; embeddable
// links (Spotify/Apple/YouTube) validated against the whitelist.

function clean(v) {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

function validateEpisode({ spotify_url, apple_url, youtube_url, audio_url }) {
  const embeds = [spotify_url, apple_url, youtube_url].filter(Boolean);
  for (const url of embeds) {
    if (!parseEmbed(url)) {
      throw new Error('Each platform link must be a supported Spotify, Apple Podcasts, or YouTube URL.');
    }
  }
  if (!spotify_url && !apple_url && !youtube_url && !audio_url) {
    throw new Error('An episode needs at least one listen link (Spotify, Apple, YouTube, or audio).');
  }
}

export async function listEpisodes(churchId, { visibleOnly = false } = {}) {
  let q = supabase
    .from('podcast_episodes')
    .select('*')
    .eq('church_id', churchId)
    .is('deleted_at', null)
    .order('season', { ascending: false, nullsFirst: false })
    .order('episode_number', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false });
  if (visibleOnly) q = q.eq('is_visible_on_portal', true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getEpisode(id) {
  const { data, error } = await supabase.from('podcast_episodes').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createEpisode(churchId, payload, createdByUserId) {
  const urls = {
    spotify_url: clean(payload.spotify_url),
    apple_url: clean(payload.apple_url),
    youtube_url: clean(payload.youtube_url),
    audio_url: clean(payload.audio_url),
  };
  validateEpisode(urls);
  const { data, error } = await supabase
    .from('podcast_episodes')
    .insert({
      church_id: churchId,
      title: payload.title.trim(),
      description: clean(payload.description),
      season: payload.season || null,
      episode_number: payload.episode_number || null,
      ...urls,
      cover_image_url: clean(payload.cover_image_url),
      published_at: payload.published_at || new Date().toISOString(),
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

export async function updateEpisode(id, patch) {
  const touchesUrls = ['spotify_url', 'apple_url', 'youtube_url', 'audio_url'].some((k) => patch[k] !== undefined);
  if (touchesUrls) {
    validateEpisode({
      spotify_url: patch.spotify_url,
      apple_url: patch.apple_url,
      youtube_url: patch.youtube_url,
      audio_url: patch.audio_url,
    });
  }
  const { data, error } = await supabase
    .from('podcast_episodes')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEpisode(id) {
  return updateEpisode(id, { deleted_at: new Date().toISOString() });
}

export async function setEpisodeVisibility(id, visible) {
  return updateEpisode(id, { is_visible_on_portal: !!visible });
}
