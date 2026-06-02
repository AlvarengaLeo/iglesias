import { supabase } from '../lib/supabase.js';

// Calls rpc_dashboard_kpis (server-side aggregation, one round-trip)
export async function getDashboardKpis(churchId, monthAnchor = null) {
  const { data, error } = await supabase.rpc('rpc_dashboard_kpis', {
    p_church_id: churchId,
    p_month_anchor: monthAnchor || new Date().toISOString(),
  });
  if (error) throw error;
  return data;
}

// Active campaigns with progress
export async function getActiveCampaignsProgress(churchId, limit = 6) {
  const { data, error } = await supabase
    .from('vw_campaign_progress')
    .select('*')
    .eq('church_id', churchId)
    .eq('status', 'active')
    .order('end_date', { ascending: true, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// Recent activity from audit_logs
export async function getRecentActivity(churchId, limit = 10) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, actor_user_id, actor_name, after_data, metadata, created_at')
    .eq('church_id', churchId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// Dynamic pending actions based on current state
export async function getPendingActions(churchId) {
  const actions = [];

  // 1. Stripe not connected
  const { data: church } = await supabase
    .from('churches')
    .select('stripe_account_id, stripe_charges_enabled, ein')
    .eq('id', churchId)
    .single();
  if (!church?.stripe_charges_enabled) {
    actions.push({
      id: 'stripe',
      label: 'Conectar Stripe',
      meta: 'Requerido para recibir donaciones en línea',
      action: 'Conectar',
      actionTarget: 'configuracion',
      done: false,
    });
  }
  if (!church?.ein) {
    actions.push({
      id: 'ein',
      label: 'Completar datos fiscales',
      meta: 'Falta el EIN',
      actionTarget: 'configuracion',
      done: false,
    });
  } else {
    actions.push({
      id: 'ein',
      label: 'Datos fiscales completos',
      meta: 'EIN configurado',
      done: true,
    });
  }

  // 2. Portal not published or has unsaved
  const { data: portal } = await supabase
    .from('portal_settings')
    .select('publish_status, published_at')
    .eq('church_id', churchId)
    .maybeSingle();
  if (portal?.publish_status === 'unsaved_changes' || (portal && !portal.published_at)) {
    actions.push({
      id: 'portal',
      label: 'Publicar portal',
      meta: portal.publish_status === 'unsaved_changes' ? 'Cambios sin publicar' : 'Portal aún no publicado',
      actionTarget: 'portal',
      done: false,
    });
  }

  // 3. Failed receipts
  const { count: failedReceipts } = await supabase
    .from('contribution_receipts')
    .select('id', { count: 'exact', head: true })
    .eq('church_id', churchId)
    .eq('status', 'failed');
  if (failedReceipts && failedReceipts > 0) {
    actions.push({
      id: 'failed_receipts',
      label: 'Revisar recibos fallidos',
      meta: `${failedReceipts} recibo${failedReceipts === 1 ? '' : 's'} con error`,
      actionTarget: 'donaciones',
      done: false,
    });
  }

  // 4. Pending donations
  const { count: pendingDonations } = await supabase
    .from('donations')
    .select('id', { count: 'exact', head: true })
    .eq('church_id', churchId)
    .eq('payment_status', 'pending')
    .is('deleted_at', null);
  if (pendingDonations && pendingDonations > 0) {
    actions.push({
      id: 'pending_donations',
      label: 'Revisar donaciones pendientes',
      meta: `${pendingDonations} donación${pendingDonations === 1 ? '' : 'es'} sin confirmar`,
      actionTarget: 'donaciones',
      done: false,
    });
  }

  return actions;
}

// Monthly trend (last N months). Llama a la RPC real-time para evitar mv stale.
export async function getMonthlyTrend(churchId, monthsBack = 8) {
  const { data, error } = await supabase.rpc('rpc_monthly_donations_series', {
    p_church_id: churchId,
    p_months_back: monthsBack,
  });
  if (error) throw error;
  return (data || []).map((r) => ({
    year: r.year,
    month: r.month,
    total_cents: Number(r.total_cents),
  }));
}

// Aggregations for "this month"
export async function getThisMonthBreakdown(churchId) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

  const { data: rows } = await supabase
    .from('donations')
    .select('amount_cents, fund:funds(name), frequency, payment_method')
    .eq('church_id', churchId)
    .eq('payment_status', 'paid')
    .is('deleted_at', null)
    .gte('donation_date', monthStart)
    .lt('donation_date', monthEnd);

  const byFund = {};
  const byFreq = {};
  for (const r of rows || []) {
    const f = r.fund?.name || '—';
    byFund[f] = (byFund[f] || 0) + Number(r.amount_cents);
    const freqLabel = { one_time: 'Única', monthly: 'Mensual', annual: 'Anual' }[r.frequency] || r.frequency;
    byFreq[freqLabel] = (byFreq[freqLabel] || 0) + Number(r.amount_cents);
  }

  return {
    byFund: Object.entries(byFund).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    byFreq: Object.entries(byFreq).map(([label, value], i) => ({
      label, value,
      color: ['#16307F', '#2348C4', '#9CC0EA', '#6F8AFF'][i % 4],
    })),
  };
}

// Build the last N month buckets: [{ key:'YYYY-MM', label:'Jun' }] ending in the current month.
function lastMonths(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let label = d.toLocaleDateString('es', { month: 'short' }).replace('.', '');
    label = label.charAt(0).toUpperCase() + label.slice(1);
    out.push({ key, label });
  }
  return out;
}

// BI: donor base health — new vs. returning donors per month (donor retention).
// A donor is "new" in the month of their first-ever paid donation, "returning"
// in any later month they give. Anonymous gifts (no person) are excluded.
export async function getDonorAcquisition(churchId, monthsBack = 6) {
  const { data, error } = await supabase
    .from('donations')
    .select('donor_person_id, donation_date')
    .eq('church_id', churchId)
    .eq('payment_status', 'paid')
    .is('deleted_at', null)
    .not('donor_person_id', 'is', null);
  if (error) throw error;

  const ym = (s) => String(s).slice(0, 7);
  const firstMonth = {};
  for (const r of data || []) {
    const m = ym(r.donation_date);
    if (!firstMonth[r.donor_person_id] || m < firstMonth[r.donor_person_id]) firstMonth[r.donor_person_id] = m;
  }

  const keys = lastMonths(monthsBack);
  const series = keys.map(({ key, label }) => {
    const donors = new Set((data || []).filter((r) => ym(r.donation_date) === key).map((r) => r.donor_person_id));
    let nuevos = 0; let existentes = 0;
    for (const id of donors) (firstMonth[id] === key ? (nuevos += 1) : (existentes += 1));
    return { label, values: { nuevos, existentes } };
  });

  const last = series[series.length - 1];
  const total = last ? last.values.nuevos + last.values.existentes : 0;
  const retentionPct = total > 0 ? Math.round((last.values.existentes / total) * 100) : null;
  const hasData = series.some((m) => m.values.nuevos + m.values.existentes > 0);
  return { data: series, retentionPct, hasData };
}

// BI: income composition — recurring vs. one-time giving per month (in dollars).
// Recurring = donations marked monthly/annual; predictable income for the church.
export async function getIncomeComposition(churchId, monthsBack = 6) {
  const start = new Date();
  start.setMonth(start.getMonth() - (monthsBack - 1));
  start.setDate(1); start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('donations')
    .select('donation_date, amount_cents, frequency')
    .eq('church_id', churchId)
    .eq('payment_status', 'paid')
    .is('deleted_at', null)
    .gte('donation_date', start.toISOString());
  if (error) throw error;

  const keys = lastMonths(monthsBack);
  const idx = Object.fromEntries(keys.map((k, i) => [k.key, i]));
  const series = keys.map((k) => ({ label: k.label, values: { recurrente: 0, puntual: 0 } }));
  for (const r of data || []) {
    const i = idx[String(r.donation_date).slice(0, 7)];
    if (i == null) continue;
    const cents = Number(r.amount_cents);
    if (r.frequency === 'monthly' || r.frequency === 'annual') series[i].values.recurrente += cents;
    else series[i].values.puntual += cents;
  }

  const last = series[series.length - 1];
  const tot = last ? last.values.recurrente + last.values.puntual : 0;
  const recurringSharePct = tot > 0 ? Math.round((last.values.recurrente / tot) * 100) : null;
  const dollars = series.map((m) => ({ label: m.label, values: { recurrente: m.values.recurrente / 100, puntual: m.values.puntual / 100 } }));
  const hasData = dollars.some((m) => m.values.recurrente + m.values.puntual > 0);
  return { data: dollars, recurringSharePct, hasData };
}
