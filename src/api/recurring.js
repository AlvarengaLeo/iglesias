import { supabase } from '../lib/supabase.js';

export async function listRecurring(churchId, { activeOnly = false } = {}) {
  let q = supabase
    .from('vw_active_recurring')
    .select('*')
    .eq('church_id', churchId);

  const { data, error } = await q;
  if (error) {
    // Fallback to direct table if view fails (unlikely)
    const { data: raw } = await supabase
      .from('recurring_donation_profiles')
      .select('*, donor:people(first_name, last_name, organization_name)')
      .eq('church_id', churchId);
    return raw || [];
  }
  return data || [];
}

export async function listAllRecurring(churchId) {
  const { data, error } = await supabase
    .from('recurring_donation_profiles')
    .select(`
      *,
      donor:people ( id, first_name, last_name, organization_name, email ),
      fund:funds ( id, name ),
      campaign:campaigns ( id, name )
    `)
    .eq('church_id', churchId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function cancelRecurring(profileId, reason) {
  const { data, error } = await supabase
    .from('recurring_donation_profiles')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      cancel_reason: reason || null,
    })
    .eq('id', profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function pauseRecurring(profileId) {
  const { data, error } = await supabase
    .from('recurring_donation_profiles')
    .update({ status: 'paused' })
    .eq('id', profileId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
