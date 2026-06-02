import { supabase } from '../lib/supabase.js';

// All amounts returned in cents.

export async function getReportKpis(churchId, { dateStart, dateEnd, fundId, campaignId } = {}) {
  let q = supabase
    .from('donations')
    .select('amount_cents, processing_fee_cents, donor_person_id, fund_id')
    .eq('church_id', churchId)
    .eq('payment_status', 'paid')
    .is('deleted_at', null);
  if (dateStart) q = q.gte('donation_date', dateStart);
  if (dateEnd)   q = q.lte('donation_date', dateEnd);
  if (fundId)    q = q.eq('fund_id', fundId);
  if (campaignId) q = q.eq('campaign_id', campaignId);

  const { data, error } = await q;
  if (error) throw error;

  const total = (data || []).reduce((s, d) => s + Number(d.amount_cents), 0);
  const fees  = (data || []).reduce((s, d) => s + Number(d.processing_fee_cents || 0), 0);
  const uniqueDonors = new Set((data || []).map((d) => d.donor_person_id).filter(Boolean)).size;

  // Top campaign in range
  const { data: campRows } = await supabase
    .from('donations')
    .select('campaign_id, amount_cents')
    .eq('church_id', churchId)
    .eq('payment_status', 'paid')
    .is('deleted_at', null)
    .not('campaign_id', 'is', null);

  const campTotals = {};
  for (const r of campRows || []) {
    campTotals[r.campaign_id] = (campTotals[r.campaign_id] || 0) + Number(r.amount_cents);
  }
  const topCampaignId = Object.entries(campTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
  let topCampaign = null;
  if (topCampaignId) {
    const { data: c } = await supabase.from('campaigns').select('id, name').eq('id', topCampaignId).single();
    topCampaign = c ? { ...c, total_cents: campTotals[topCampaignId] } : null;
  }

  return {
    totalCents: total,
    netCents: total - fees,
    feesCents: fees,
    uniqueDonors,
    topCampaign,
  };
}

// Aggregations for charts. Llama RPC real-time (reemplaza mv_church_monthly_donations).
export async function getMonthlyDonations(churchId, monthsBack = 12) {
  const { data, error } = await supabase.rpc('rpc_monthly_donations_series', {
    p_church_id: churchId,
    p_months_back: monthsBack,
  });
  if (error) throw error;
  return (data || []).map((r) => ({
    year: r.year,
    month: r.month,
    total_cents: Number(r.total_cents),
    donation_count: Number(r.donation_count),
  }));
}

export async function getDonationsByFund(churchId, { dateStart, dateEnd } = {}) {
  let q = supabase
    .from('donations')
    .select('fund_id, amount_cents, fund:funds(name)')
    .eq('church_id', churchId)
    .eq('payment_status', 'paid')
    .is('deleted_at', null);
  if (dateStart) q = q.gte('donation_date', dateStart);
  if (dateEnd)   q = q.lte('donation_date', dateEnd);
  const { data, error } = await q;
  if (error) throw error;

  const groups = {};
  for (const r of data || []) {
    const name = r.fund?.name || '—';
    groups[name] = (groups[name] || 0) + Number(r.amount_cents);
  }
  return Object.entries(groups).map(([name, total]) => ({ label: name, value: total })).sort((a, b) => b.value - a.value);
}

export async function getDonationsByMethod(churchId, { dateStart, dateEnd } = {}) {
  let q = supabase
    .from('donations')
    .select('payment_method, amount_cents')
    .eq('church_id', churchId)
    .eq('payment_status', 'paid')
    .is('deleted_at', null);
  if (dateStart) q = q.gte('donation_date', dateStart);
  if (dateEnd)   q = q.lte('donation_date', dateEnd);
  const { data, error } = await q;
  if (error) throw error;

  const labels = { card: 'Tarjeta', ach: 'ACH', cash: 'Efectivo', check: 'Cheque', stripe: 'Stripe', other: 'Otro' };
  const colors = { card: '#16307F', ach: '#2348C4', cash: '#6F8AFF', check: '#9CC0EA', stripe: '#3B2F8F', other: '#9AA3B2' };
  const groups = {};
  for (const r of data || []) {
    groups[r.payment_method] = (groups[r.payment_method] || 0) + Number(r.amount_cents);
  }
  return Object.entries(groups).map(([m, total]) => ({ label: labels[m] || m, value: total, color: colors[m] || '#666' }));
}

export async function getTopCampaigns(churchId, limit = 5) {
  const { data, error } = await supabase
    .from('vw_campaign_progress')
    .select('campaign_id, name, collected_cents, goal_cents')
    .eq('church_id', churchId)
    .order('collected_cents', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map((c) => ({ label: c.name, value: Number(c.collected_cents) }));
}
