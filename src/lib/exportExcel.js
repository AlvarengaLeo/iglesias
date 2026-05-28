import * as XLSX from 'xlsx';
import { listDonations, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL, FREQUENCY_LABEL } from '../api/donations.js';
import { listPeople, STATUS_TO_UI, personDisplayName } from '../api/people.js';

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
