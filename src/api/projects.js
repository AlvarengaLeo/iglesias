import { supabase } from '../lib/supabase.js';
import { isSafeExternalUrl } from '../lib/embed.js';

// Admin CRUD for projects/ministries. RLS enforces role IN ('admin','pastor','secretary').
// Soft delete via deleted_at. link_url validated as a safe http(s) link.

const CATEGORIES = ['ministry', 'project', 'mission'];

function clean(v) {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

function validateLink(url) {
  if (url && !isSafeExternalUrl(url)) {
    throw new Error('Link must be a valid http(s) URL.');
  }
}

export async function listProjects(churchId, { category = null, visibleOnly = false } = {}) {
  let q = supabase
    .from('projects')
    .select('*')
    .eq('church_id', churchId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (category) q = q.eq('category', category);
  if (visibleOnly) q = q.eq('is_visible_on_portal', true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getProject(id) {
  const { data, error } = await supabase.from('projects').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createProject(churchId, payload, createdByUserId) {
  validateLink(payload.link_url);
  const category = CATEGORIES.includes(payload.category) ? payload.category : 'ministry';
  const { data, error } = await supabase
    .from('projects')
    .insert({
      church_id: churchId,
      name: payload.name.trim(),
      description: clean(payload.description),
      category,
      image_url: clean(payload.image_url),
      link_url: clean(payload.link_url),
      leader_name: clean(payload.leader_name),
      fund_id: payload.fund_id || null,
      campaign_id: payload.campaign_id || null,
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

export async function updateProject(id, patch) {
  if (patch.link_url !== undefined) validateLink(patch.link_url);
  const { data, error } = await supabase
    .from('projects')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProject(id) {
  return updateProject(id, { deleted_at: new Date().toISOString() });
}

export async function setProjectVisibility(id, visible) {
  return updateProject(id, { is_visible_on_portal: !!visible });
}

export async function setProjectFeatured(id, featured) {
  return updateProject(id, { is_featured: !!featured });
}
