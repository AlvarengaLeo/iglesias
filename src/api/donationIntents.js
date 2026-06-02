import { supabase } from '../lib/supabase.js';

// =====================================================================
// Donation Intents — admin API
// =====================================================================

export const INTENT_STATUS_LABEL = {
  pending_payment:          'Pendiente',
  payment_provider_pending: 'En pasarela',
  completed:                'Completada',
  canceled:                 'Cancelada',
  expired:                  'Expirada',
  failed:                   'Fallida',
};

export const INTENT_STATUS_TONE = {
  pending_payment:          'warning',
  payment_provider_pending: 'info',
  completed:                'success',
  canceled:                 'muted',
  expired:                  'muted',
  failed:                   'error',
};

export const INTENT_FREQUENCY_LABEL = {
  one_time: 'Única',
  monthly:  'Mensual',
  annual:   'Anual',
};

export const INTENT_TYPE_LABEL = {
  individual: 'Persona',
  business:   'Empresa',
  anonymous:  'Anónimo',
};

// =====================================================================
// Listar intents (admin), con joins ligeros
// =====================================================================
export async function listIntents(churchId, { status, limit = 200, pendingOnly = false } = {}) {
  let q = supabase
    .from('donation_intents')
    .select(`
      id, church_id, fund_id, campaign_id, donor_person_id,
      donor_type, donor_first_name, donor_last_name,
      donor_business_name, donor_contact_name, donor_email, donor_phone,
      amount_cents, currency, frequency, note, source,
      status, admin_notes, contacted_at, contacted_by,
      donation_id, completed_at,
      provider, provider_redirect_url,
      expires_at, created_at, updated_at,
      fund:funds(id, name),
      campaign:campaigns(id, name)
    `)
    .eq('church_id', churchId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (pendingOnly) {
    q = q.in('status', ['pending_payment', 'payment_provider_pending']);
  } else if (status) {
    q = q.eq('status', status);
  }

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getIntent(intentId) {
  const { data, error } = await supabase
    .from('donation_intents')
    .select(`
      *,
      fund:funds(id, name),
      campaign:campaigns(id, name)
    `)
    .eq('id', intentId)
    .single();
  if (error) throw error;
  return data;
}

// =====================================================================
// Conteo pendientes (para badge del tab)
// =====================================================================
export async function countPendingIntents(churchId) {
  const { count, error } = await supabase
    .from('donation_intents')
    .select('id', { count: 'exact', head: true })
    .eq('church_id', churchId)
    .in('status', ['pending_payment', 'payment_provider_pending']);
  if (error) throw error;
  return count || 0;
}

// =====================================================================
// Acciones via RPCs
// =====================================================================
export async function linkIntentToDonation(intentId, donationId) {
  const { data, error } = await supabase.rpc('rpc_link_intent_to_donation', {
    p_intent_id: intentId,
    p_donation_id: donationId,
  });
  if (error) throw error;
  return data;
}

export async function markContacted(intentId, adminNotes = null) {
  const { data, error } = await supabase.rpc('rpc_update_intent_status', {
    p_intent_id: intentId,
    p_action: 'mark_contacted',
    p_admin_notes: adminNotes,
  });
  if (error) throw error;
  return data;
}

export async function cancelIntent(intentId, adminNotes = null) {
  const { data, error } = await supabase.rpc('rpc_update_intent_status', {
    p_intent_id: intentId,
    p_action: 'cancel',
    p_admin_notes: adminNotes,
  });
  if (error) throw error;
  return data;
}

// =====================================================================
// Helpers de display
// =====================================================================
export function intentDonorDisplayName(intent) {
  if (!intent) return '—';
  if (intent.donor_type === 'business') {
    return intent.donor_business_name || '—';
  }
  if (intent.donor_type === 'anonymous') return 'Anónimo';
  return [intent.donor_first_name, intent.donor_last_name].filter(Boolean).join(' ') || '—';
}

export function intentDonorInitials(intent) {
  if (!intent) return '··';
  if (intent.donor_type === 'business') {
    const n = (intent.donor_business_name || '').split(' ').filter(Boolean).slice(0, 2);
    return n.map((w) => w[0]?.toUpperCase()).join('') || 'B';
  }
  const n = [intent.donor_first_name, intent.donor_last_name].filter(Boolean);
  return n.map((w) => w[0]?.toUpperCase()).join('') || '··';
}

export function intentReferenceCode(intent) {
  if (!intent?.id) return null;
  return 'DN-' + intent.id.slice(0, 8).toUpperCase();
}
