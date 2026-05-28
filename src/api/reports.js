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

// Aggregations for charts
export async function getMonthlyDonations(churchId, monthsBack = 12) {
  const { data, error } = await supabase
    .from('mv_church_monthly_donations')
    .select('year, month, total_cents, donation_count, unique_donor_count')
    .eq('church_id', churchId)
    .order('year', { ascending: true })
    .order('month', { ascending: true });
  if (error) throw error;

  // Group by year-month (mv has fund/method breakdown)
  const grouped = {};
  for (const r of data || []) {
    const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
    if (!grouped[key]) grouped[key] = { year: r.year, month: r.month, total_cents: 0, donation_count: 0 };
    grouped[key].total_cents += Number(r.total_cents);
    grouped[key].donation_count += Number(r.donation_count);
  }
  return Object.values(grouped).slice(-monthsBack);
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
  const colors = { card: '#1F2B38', ach: '#8A6A4A', cash: '#B89A7A', check: '#5C7CB0', stripe: '#864F8C', other: '#666' };
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
