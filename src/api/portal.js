import { supabase } from '../lib/supabase.js';

// Public anonymous portal data by slug. Uses RLS anon policies.
// Returns combined { church, portal, campaigns, serviceTimes } or null.
export async function getPublicPortalBySlug(slug) {
  if (!slug) return null;

  const { data: church, error: cErr } = await supabase
    .from('churches')
    .select('id, public_name, slug, primary_color, logo_url, ein')
    .eq('slug', slug)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!church) return null;

  const { data: portal } = await supabase
    .from('portal_settings')
    .select('published_data, published_at')
    .eq('church_id', church.id)
    .eq('publish_status', 'published')
    .maybeSingle();

  // If never published, return null (page should show "not published" state)
  if (!portal) return { church, portal: null };

  const [{ data: campaigns }, { data: serviceTimes }] = await Promise.all([
    supabase.from('campaigns')
      .select('id, name, description, goal_cents, currency, end_date, image_url')
      .eq('church_id', church.id)
      .eq('is_visible_on_portal', true)
      .eq('status', 'active')
      .is('deleted_at', null),
    supabase.from('service_times')
      .select('id, day_of_week, start_time, duration_min, meeting_type, location, address, sort_order')
      .eq('church_id', church.id)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true }),
  ]);

  return {
    church,
    portal,
    campaigns: campaigns || [],
    serviceTimes: serviceTimes || [],
  };
}

export async function getPortalSettings(churchId) {
  const { data, error } = await supabase
    .from('portal_settings')
    .select('*')
    .eq('church_id', churchId)
    .maybeSingle();
  if (error) throw error;

  // If portal_settings row doesn't exist yet, create one
  if (!data) {
    const { data: created, error: cErr } = await supabase
      .from('portal_settings')
      .insert({ church_id: churchId, draft_data: {}, published_data: {}, publish_status: 'draft' })
      .select()
      .single();
    if (cErr) throw cErr;
    return created;
  }
  return data;
}

export async function saveDraft(churchId, draftData) {
  const { data, error } = await supabase
    .from('portal_settings')
    .update({
      draft_data: draftData,
      draft_updated_at: new Date().toISOString(),
      publish_status: 'unsaved_changes',
    })
    .eq('church_id', churchId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function publishPortal(churchId) {
  const { data, error } = await supabase.rpc('rpc_publish_portal', { p_church_id: churchId });
  if (error) throw error;
  return data;
}

export async function discardDraft(churchId) {
  const { data, error } = await supabase.rpc('rpc_discard_portal_draft', { p_church_id: churchId });
  if (error) throw error;
  return data;
}

// Helper: deep-equal draft vs published to know if there are unsaved changes
export function hasUnsavedChanges(settings) {
  return JSON.stringify(settings.draft_data) !== JSON.stringify(settings.published_data);
}
