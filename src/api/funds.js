import { supabase } from '../lib/supabase.js';

export async function listFunds(churchId, { activeOnly = true } = {}) {
  let q = supabase
    .from('funds')
    .select('id, name, code, description, is_default, is_active, sort_order')
    .eq('church_id', churchId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true });
  if (activeOnly) q = q.eq('is_active', true);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createFund(churchId, { name, code, description, isDefault }) {
  const { data, error } = await supabase
    .from('funds')
    .insert({
      church_id: churchId,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description?.trim() || null,
      is_default: !!isDefault,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
