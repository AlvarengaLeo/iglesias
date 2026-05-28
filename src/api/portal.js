import { supabase } from '../lib/supabase.js';

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
