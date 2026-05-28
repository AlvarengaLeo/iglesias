import { supabase } from '../lib/supabase.js';

export const PAYMENT_METHOD_LABEL = {
  card: 'Tarjeta', ach: 'ACH', cash: 'Efectivo',
  check: 'Cheque', stripe: 'Stripe', other: 'Otro',
};

export const PAYMENT_STATUS_LABEL = {
  pending: 'Pendiente', paid: 'Pagada', failed: 'Fallida',
  refunded: 'Reembolsada', disputed: 'Disputa',
};

export const PAYMENT_STATUS_TONE = {
  pending: 'warning', paid: 'success', failed: 'error',
  refunded: 'muted', disputed: 'error',
};

export const FREQUENCY_LABEL = {
  one_time: 'Única', monthly: 'Mensual', annual: 'Anual',
};

// =====================================================
// List donations with filters + joins
// =====================================================
export async function listDonations(churchId, filters = {}) {
  let q = supabase
    .from('donations')
    .select(`
      id, amount_cents, processing_fee_cents, currency,
      payment_method, payment_status, frequency,
      donation_date, stripe_payment_intent_id, check_number, notes,
      donor_name_snapshot, donor_email_snapshot, is_anonymous,
      donor_person_id,
      fund:funds ( id, name ),
      campaign:campaigns ( id, name ),
      receipt:contribution_receipts ( id, receipt_number, status )
    `)
    .eq('church_id', churchId)
    .is('deleted_at', null)
    .order('donation_date', { ascending: false })
    .limit(filters.limit || 200);

  if (filters.fund_id)       q = q.eq('fund_id', filters.fund_id);
  if (filters.campaign_id)   q = q.eq('campaign_id', filters.campaign_id);
  if (filters.payment_method) q = q.eq('payment_method', filters.payment_method);
  if (filters.payment_status) q = q.eq('payment_status', filters.payment_status);
  if (filters.frequency)     q = q.eq('frequency', filters.frequency);
  if (filters.dateStart)     q = q.gte('donation_date', filters.dateStart);
  if (filters.dateEnd)       q = q.lte('donation_date', filters.dateEnd);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// Get full detail for drawer
export async function getDonationDetail(donationId) {
  const { data: donation, error } = await supabase
    .from('donations')
    .select(`
      *,
      fund:funds ( id, name, code ),
      campaign:campaigns ( id, name ),
      receipt:contribution_receipts ( id, receipt_number, status, pdf_storage_path, created_at )
    `)
    .eq('id', donationId)
    .single();
  if (error) throw error;

  let deliveries = [];
  if (donation.receipt?.id) {
    const { data } = await supabase
      .from('receipt_deliveries')
      .select('id, delivery_channel, recipient_email, reason, reason_notes, status, sent_at, delivered_at, sent_by')
      .eq('receipt_id', donation.receipt.id)
      .order('sent_at', { ascending: false });
    deliveries = data || [];
  }

  return { donation, deliveries };
}

// =====================================================
// Register donation via RPC (creates donation + receipt atomically)
// =====================================================
export async function registerDonation({ churchId, personId, amountCents, fundId, campaignId, paymentMethod, paymentStatus, frequency, donationDate, notes, autoGenerateReceipt = true }) {
  const { data, error } = await supabase.rpc('rpc_register_donation', {
    p_church_id: churchId,
    p_donor_person_id: personId,
    p_amount_cents: amountCents,
    p_fund_id: fundId,
    p_campaign_id: campaignId || null,
    p_payment_method: paymentMethod,
    p_payment_status: paymentStatus || 'paid',
    p_frequency: frequency || 'one_time',
    p_donation_date: donationDate || new Date().toISOString(),
    p_notes: notes || null,
    p_auto_generate_receipt: autoGenerateReceipt,
  });
  if (error) throw error;
  return data; // { donation_id, receipt_id, receipt_number }
}

export async function updateDonation(donationId, patch) {
  const { data, error } = await supabase
    .from('donations')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', donationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function softDeleteDonation(donationId) {
  return updateDonation(donationId, { deleted_at: new Date().toISOString() });
}

// =====================================================
// Quick KPIs for Donaciones page header
// =====================================================
export async function getDonationsKpis(churchId, { monthStart, monthEnd } = {}) {
  const now = new Date();
  const startMs = monthStart || new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endMs = monthEnd || new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const { data: monthRows } = await supabase
    .from('donations')
    .select('amount_cents')
    .eq('church_id', churchId)
    .eq('payment_status', 'paid')
    .is('deleted_at', null)
    .gte('donation_date', startMs)
    .lt('donation_date', endMs);
  const monthTotal = (monthRows || []).reduce((s, d) => s + Number(d.amount_cents), 0);

  const { count: pendingCount } = await supabase
    .from('donations')
    .select('id', { count: 'exact', head: true })
    .eq('church_id', churchId)
    .eq('payment_status', 'pending')
    .is('deleted_at', null);

  const { data: pendingRows } = await supabase
    .from('donations')
    .select('amount_cents')
    .eq('church_id', churchId)
    .eq('payment_status', 'pending')
    .is('deleted_at', null);
  const pendingTotal = (pendingRows || []).reduce((s, d) => s + Number(d.amount_cents), 0);

  const { count: recurringActiveCount } = await supabase
    .from('recurring_donation_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('church_id', churchId)
    .eq('status', 'active');

  const { count: receiptsCount } = await supabase
    .from('contribution_receipts')
    .select('id', { count: 'exact', head: true })
    .eq('church_id', churchId)
    .gte('created_at', startMs)
    .lt('created_at', endMs);

  return {
    monthTotal,
    pendingCount: pendingCount || 0,
    pendingTotal,
    recurringActiveCount: recurringActiveCount || 0,
    receiptsThisMonth: receiptsCount || 0,
  };
}
