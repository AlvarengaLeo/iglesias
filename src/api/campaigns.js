import { supabase } from '../lib/supabase.js';

export async function listCampaigns(churchId, { activeOnly = false } = {}) {
  let q = supabase
    .from('campaigns')
    .select(`
      id, name, slug, description, goal_cents, currency,
      start_date, end_date, status, is_visible_on_portal, image_url,
      fund:funds ( id, name )
    `)
    .eq('church_id', churchId)
    .is('deleted_at', null)
    .order('start_date', { ascending: false });
  if (activeOnly) q = q.eq('status', 'active');
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function listCampaignProgress(churchId) {
  // Use the view
  const { data, error } = await supabase
    .from('vw_campaign_progress')
    .select('*')
    .eq('church_id', churchId)
    .order('collected_cents', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createCampaign(churchId, payload, createdByUserId) {
  const slug = (payload.slug || payload.name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      church_id: churchId,
      name: payload.name.trim(),
      slug,
      description: payload.description?.trim() || null,
      goal_cents: payload.goal_cents,
      fund_id: payload.fund_id || null,
      start_date: payload.start_date || new Date().toISOString().split('T')[0],
      end_date: payload.end_date || null,
      status: payload.status || 'active',
      is_visible_on_portal: !!payload.is_visible_on_portal,
      created_by: createdByUserId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCampaign(campaignId, patch) {
  const { data, error } = await supabase
    .from('campaigns')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', campaignId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function setCampaignVisibility(campaignId, visible) {
  return updateCampaign(campaignId, { is_visible_on_portal: !!visible });
}
