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

// Monthly trend (last 8 months)
export async function getMonthlyTrend(churchId, monthsBack = 8) {
  const { data, error } = await supabase
    .from('mv_church_monthly_donations')
    .select('year, month, total_cents')
    .eq('church_id', churchId)
    .order('year', { ascending: true })
    .order('month', { ascending: true });
  if (error) {
    // Fallback to live query
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);
    const { data: live } = await supabase
      .from('donations')
      .select('donation_date, amount_cents')
      .eq('church_id', churchId)
      .eq('payment_status', 'paid')
      .is('deleted_at', null)
      .gte('donation_date', startDate.toISOString());
    const grouped = {};
    for (const d of live || []) {
      const dt = new Date(d.donation_date);
      const key = `${dt.getFullYear()}-${dt.getMonth() + 1}`;
      grouped[key] = (grouped[key] || 0) + Number(d.amount_cents);
    }
    return Object.entries(grouped).map(([k, v]) => {
      const [y, m] = k.split('-').map(Number);
      return { year: y, month: m, total_cents: v };
    });
  }

  const grouped = {};
  for (const r of data || []) {
    const key = `${r.year}-${r.month}`;
    grouped[key] = (grouped[key] || 0) + Number(r.total_cents);
  }
  return Object.entries(grouped).map(([k, v]) => {
    const [y, m] = k.split('-').map(Number);
    return { year: y, month: m, total_cents: v };
  }).slice(-monthsBack);
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
      color: ['#1F2B38', '#8A6A4A', '#B89A7A', '#5C7CB0'][i % 4],
    })),
  };
}
