import { supabase } from '../lib/supabase.js';

// Public anonymous read wrappers for the dedicated archive pages.
// All go through SECURITY DEFINER RPCs that gate on publish_status='published'
// and is_visible_on_portal. They return null only when the portal isn't
// published; otherwise an object with { total, items, ... }.

export async function getPublicSermonsBySlug(slug, { limit = 12, offset = 0, series = null } = {}) {
  if (!slug) return null;
  const { data, error } = await supabase.rpc('rpc_public_sermons_by_slug', {
    p_slug: slug,
    p_limit: limit,
    p_offset: offset,
    p_series: series,
  });
  if (error) throw error;
  if (data === null) return { total: 0, limit, offset, series: [], items: [] };
  return {
    total: data.total || 0,
    limit: data.limit || limit,
    offset: data.offset || offset,
    series: data.series || [],
    items: data.items || [],
  };
}

export async function getPublicSermonById(slug, id) {
  if (!slug || !id) return null;
  const { data, error } = await supabase.rpc('rpc_public_sermon_by_id', {
    p_slug: slug,
    p_id: id,
  });
  if (error) throw error;
  return data || null;
}

export async function getPublicPodcastBySlug(slug, { limit = 12, offset = 0 } = {}) {
  if (!slug) return null;
  const { data, error } = await supabase.rpc('rpc_public_podcast_by_slug', {
    p_slug: slug,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  if (data === null) return { total: 0, limit, offset, items: [] };
  return {
    total: data.total || 0,
    limit: data.limit || limit,
    offset: data.offset || offset,
    items: data.items || [],
  };
}

export async function getPublicEventsBySlug(slug) {
  if (!slug) return [];
  const { data, error } = await supabase.rpc('rpc_public_events_by_slug', { p_slug: slug });
  if (error) throw error;
  return data?.items || [];
}

export async function getPublicProjectsBySlug(slug) {
  if (!slug) return [];
  const { data, error } = await supabase.rpc('rpc_public_projects_by_slug', { p_slug: slug });
  if (error) throw error;
  return data?.items || [];
}
