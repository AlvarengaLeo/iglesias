import * as XLSX from 'xlsx';
import { listDonations, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, FREQUENCY_LABEL } from '../api/donations.js';
import { listPeople, STATUS_TO_UI, personDisplayName } from '../api/people.js';
import { listReceipts, RECEIPT_STATUS_LABEL } from '../api/receipts.js';
import { listAllRecurring } from '../api/recurring.js';
import { supabase } from './supabase.js';

// Export current donation filters to .xlsx
export async function exportDonationsToExcel(churchId, filters = {}, filename) {
  const donations = await listDonations(churchId, { ...filters, limit: 10000 });

  const rows = donations.map((d) => ({
    'Fecha': new Date(d.donation_date).toLocaleDateString('es'),
    'Donante': d.donor_name_snapshot,
    'Email': d.donor_email_snapshot || '',
    'Monto USD': (Number(d.amount_cents) / 100).toFixed(2),
    'Comisión USD': (Number(d.processing_fee_cents || 0) / 100).toFixed(2),
    'Fondo': d.fund?.name || '',
    'Campaña': d.campaign?.name || '',
    'Frecuencia': FREQUENCY_LABEL[d.frequency] || d.frequency,
    'Método': PAYMENT_METHOD_LABEL[d.payment_method] || d.payment_method,
    'Estado': PAYMENT_STATUS_LABEL[d.payment_status] || d.payment_status,
    'Recibo #': d.receipt?.receipt_number || '',
    'Stripe ID': d.stripe_payment_intent_id || '',
    'Notas': d.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 12 },
    { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 14 }, { wch: 32 }, { wch: 32 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Donaciones');

  const name = filename || `donaciones-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, name);
  return { rowCount: rows.length, filename: name };
}

// Export current personas list to .xlsx (respecting filters de búsqueda/status)
export async function exportPeopleToExcel(churchId, filters = {}, filename) {
  const people = await listPeople(churchId, { ...filters, limit: 10000 });

  const rows = people.map((p) => {
    const tags = (p.tag_assignments || []).map((ta) => ta.tag?.name).filter(Boolean).join(', ');
    return {
      'Nombre': personDisplayName(p),
      'Tipo': p.person_type === 'organization' ? 'Organización' : 'Individuo',
      'Estado': STATUS_TO_UI[p.status] || p.status,
      'Email': p.email || '',
      'Teléfono': p.phone || '',
      'Etiquetas': tags,
      'Unido el': p.joined_at ? new Date(p.joined_at).toLocaleDateString('es') : '',
      'Última actividad': p.last_activity_at ? new Date(p.last_activity_at).toLocaleDateString('es') : '',
      'Próximo seguimiento': p.next_followup_at ? new Date(p.next_followup_at).toLocaleDateString('es') : '',
      'Nota pastoral': p.pastoral_note || '',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 16 },
    { wch: 26 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Personas');

  const name = filename || `personas-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, name);
  return { rowCount: rows.length, filename: name };
}

// Export receipts list (Recibos enviados report)
export async function exportReceiptsToExcel(churchId, filters = {}, filename) {
  const receipts = await listReceipts(churchId, { ...filters, limit: 10000 });
  const rows = receipts.map((r) => ({
    'Recibo #': r.receipt_number,
    'Tipo': r.receipt_type === 'annual_statement' ? `Anual ${r.tax_year}` : 'Por donación',
    'Donante': r.person_name_snapshot,
    'Email': r.person_email_snapshot || '',
    'Monto USD': (Number(r.total_amount_cents) / 100).toFixed(2),
    'Donaciones': r.donations_count,
    'Estado': RECEIPT_STATUS_LABEL[r.status] || r.status,
    'Fecha': new Date(r.created_at).toLocaleDateString('es'),
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Recibos');
  const name = filename || `recibos-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, name);
  return { rowCount: rows.length, filename: name };
}

// Export recurring donation profiles (Donantes recurrentes report)
export async function exportRecurringToExcel(churchId, filename) {
  const profiles = await listAllRecurring(churchId);
  const rows = profiles.map((r) => {
    const donorName = r.donor?.organization_name || `${r.donor?.first_name || ''} ${r.donor?.last_name || ''}`.trim() || '—';
    return {
      'Donante': donorName,
      'Email': r.donor?.email || '',
      'Monto USD': (Number(r.amount_cents) / 100).toFixed(2),
      'Frecuencia': FREQUENCY_LABEL[r.frequency] || r.frequency,
      'Método': PAYMENT_METHOD_LABEL[r.payment_method] || r.payment_method,
      'Fondo': r.fund?.name || '',
      'Campaña': r.campaign?.name || '',
      'Próximo cobro': r.next_charge_date ? new Date(r.next_charge_date).toLocaleDateString('es') : '',
      'Estado': { active: 'Activo', paused: 'Pausado', canceled: 'Cancelado', past_due: 'Atrasado' }[r.status] || r.status,
      'Inicio': new Date(r.started_at).toLocaleDateString('es'),
    };
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 14 }, { wch: 12 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Recurrentes');
  const name = filename || `donantes-recurrentes-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, name);
  return { rowCount: rows.length, filename: name };
}

// Export "large" donations (>= threshold USD)
export async function exportLargeDonationsToExcel(churchId, thresholdUsd = 500, filename) {
  const { data, error } = await supabase
    .from('donations')
    .select(`
      donation_date, donor_name_snapshot, donor_email_snapshot,
      amount_cents, payment_method, payment_status, frequency, notes,
      fund:funds(name), campaign:campaigns(name),
      receipt:contribution_receipts(receipt_number)
    `)
    .eq('church_id', churchId)
    .eq('payment_status', 'paid')
    .is('deleted_at', null)
    .gte('amount_cents', thresholdUsd * 100)
    .order('amount_cents', { ascending: false });
  if (error) throw error;

  const rows = (data || []).map((d) => ({
    'Fecha': new Date(d.donation_date).toLocaleDateString('es'),
    'Donante': d.donor_name_snapshot,
    'Email': d.donor_email_snapshot || '',
    'Monto USD': (Number(d.amount_cents) / 100).toFixed(2),
    'Fondo': d.fund?.name || '',
    'Campaña': d.campaign?.name || '',
    'Método': PAYMENT_METHOD_LABEL[d.payment_method] || d.payment_method,
    'Frecuencia': FREQUENCY_LABEL[d.frequency] || d.frequency,
    'Recibo #': d.receipt?.receipt_number || '',
    'Notas': d.notes || '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 28 }, { wch: 12 }, { wch: 18 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 32 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `Donaciones >= $${thresholdUsd}`);
  const name = filename || `donaciones-grandes-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, name);
  return { rowCount: rows.length, filename: name };
}

// Export aggregated funds report
export async function exportFundsReportToExcel(churchId, { dateStart, dateEnd } = {}, filename) {
  let q = supabase
    .from('donations')
    .select('amount_cents, fund:funds(id, name)')
    .eq('church_id', churchId)
    .eq('payment_status', 'paid')
    .is('deleted_at', null);
  if (dateStart) q = q.gte('donation_date', dateStart);
  if (dateEnd)   q = q.lte('donation_date', dateEnd);
  const { data, error } = await q;
  if (error) throw error;

  const groups = {};
  for (const r of data || []) {
    const key = r.fund?.name || '—';
    groups[key] = (groups[key] || { name: key, total: 0, count: 0 });
    groups[key].total += Number(r.amount_cents);
    groups[key].count += 1;
  }
  const total = Object.values(groups).reduce((s, g) => s + g.total, 0);
  const rows = Object.values(groups)
    .sort((a, b) => b.total - a.total)
    .map((g) => ({
      'Fondo': g.name,
      'Donaciones': g.count,
      'Total USD': (g.total / 100).toFixed(2),
      'Porcentaje': total ? ((g.total / total) * 100).toFixed(1) + '%' : '0%',
    }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 14 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Por fondo');
  const name = filename || `donaciones-por-fondo-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, name);
  return { rowCount: rows.length, filename: name };
}
