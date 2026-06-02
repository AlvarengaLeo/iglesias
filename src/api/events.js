import { supabase } from '../lib/supabase.js';
import { isSafeExternalUrl } from '../lib/embed.js';

// Admin CRUD for events. RLS enforces role IN ('admin','pastor','secretary').
// Soft delete via deleted_at. registration_url validated as a safe http(s) link.

function clean(v) {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

function validateLink(url) {
  if (url && !isSafeExternalUrl(url)) {
    throw new Error('Registration link must be a valid http(s) URL.');
  }
}

export async function listEvents(churchId, { upcomingOnly = false, visibleOnly = false } = {}) {
  let q = supabase
    .from('events')
    .select('*')
    .eq('church_id', churchId)
    .is('deleted_at', null)
    .order('starts_at', { ascending: true });
  if (visibleOnly) q = q.eq('is_visible_on_portal', true);
  if (upcomingOnly) q = q.gte('starts_at', new Date().toISOString());
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getEvent(id) {
  const { data, error } = await supabase.from('events').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createEvent(churchId, payload, createdByUserId) {
  validateLink(payload.registration_url);
  const { data, error } = await supabase
    .from('events')
    .insert({
      church_id: churchId,
      title: payload.title.trim(),
      description: clean(payload.description),
      starts_at: payload.starts_at,
      ends_at: payload.ends_at || null,
      location: clean(payload.location),
      address: clean(payload.address),
      image_url: clean(payload.image_url),
      registration_url: clean(payload.registration_url),
      category: clean(payload.category),
      is_featured: !!payload.is_featured,
      is_visible_on_portal: !!payload.is_visible_on_portal,
      sort_order: payload.sort_order || 0,
      created_by: createdByUserId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEvent(id, patch) {
  if (patch.registration_url !== undefined) validateLink(patch.registration_url);
  const { data, error } = await supabase
    .from('events')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEvent(id) {
  return updateEvent(id, { deleted_at: new Date().toISOString() });
}

export async function setEventVisibility(id, visible) {
  return updateEvent(id, { is_visible_on_portal: !!visible });
}

export async function setEventFeatured(id, featured) {
  return updateEvent(id, { is_featured: !!featured });
}
