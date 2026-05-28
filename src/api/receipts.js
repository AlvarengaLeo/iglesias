import { supabase } from '../lib/supabase.js';

export const RECEIPT_STATUS_LABEL = {
  generated: 'Generado',
  sent: 'Enviado',
  failed: 'Fallido',
  superseded: 'Reemplazado',
  void: 'Anulado',
};

export const RECEIPT_STATUS_TONE = {
  generated: 'info',
  sent: 'success',
  failed: 'error',
  superseded: 'muted',
  void: 'muted',
};

export const RESEND_REASON_LABEL = {
  initial: 'Envío inicial',
  donor_lost: 'Donante perdió el recibo',
  email_changed: 'Cambio de correo',
  accountant_request: 'Solicitud del contador',
  year_end_resend: 'Reenvío de cierre fiscal',
  correction: 'Corrección',
  other: 'Otro',
};

// =====================================================
// List receipts for the church
// =====================================================
export async function listReceipts(churchId, filters = {}) {
  let q = supabase
    .from('contribution_receipts')
    .select(`
      id, receipt_number, receipt_type, status, total_amount_cents,
      tax_year, donations_count, person_name_snapshot, person_email_snapshot,
      pdf_storage_path, created_at,
      person:people ( id, first_name, last_name, organization_name ),
      donation:donations ( id, donation_date, fund:funds(name) )
    `)
    .eq('church_id', churchId)
    .order('created_at', { ascending: false })
    .limit(filters.limit || 200);

  if (filters.status)       q = q.eq('status', filters.status);
  if (filters.receipt_type) q = q.eq('receipt_type', filters.receipt_type);
  if (filters.year)         q = q.eq('tax_year', filters.year);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// =====================================================
// Resend receipt via RPC (NEVER creates a new donation)
// =====================================================
export async function resendReceipt({ receiptId, reason, reasonNotes, recipientEmail }) {
  const { data, error } = await supabase.rpc('rpc_resend_receipt', {
    p_receipt_id: receiptId,
    p_reason: reason,
    p_reason_notes: reasonNotes || null,
    p_recipient_email: recipientEmail || null,
  });
  if (error) throw error;
  return data; // { delivery_id, recipient }
}

// Generate annual statement (writes contribution_receipts type 'annual_statement')
// Aggregates all paid donations for a person in a given year.
export async function generateAnnualStatement({ churchId, personId, taxYear, createdByUserId }) {
  // Fetch donations
  const yStart = `${taxYear}-01-01`;
  const yEnd = `${taxYear + 1}-01-01`;
  const { data: donations, error: dErr } = await supabase
    .from('donations')
    .select('amount_cents')
    .eq('church_id', churchId)
    .eq('donor_person_id', personId)
    .eq('payment_status', 'paid')
    .is('deleted_at', null)
    .gte('donation_date', yStart)
    .lt('donation_date', yEnd);
  if (dErr) throw dErr;

  if (!donations || donations.length === 0) {
    throw new Error(`Sin donaciones pagadas para esta persona en ${taxYear}.`);
  }

  const total = donations.reduce((s, d) => s + Number(d.amount_cents), 0);

  // Get person snapshot
  const { data: person } = await supabase
    .from('people')
    .select('first_name, last_name, organization_name, email')
    .eq('id', personId)
    .single();
  const personName = person.organization_name || `${person.first_name || ''} ${person.last_name || ''}`.trim();

  // Assign receipt number via RPC
  const { data: receiptNumber } = await supabase.rpc('rpc_assign_receipt_number', {
    p_church_id: churchId,
  });

  // Insert receipt
  const { data: receipt, error: rErr } = await supabase
    .from('contribution_receipts')
    .insert({
      church_id: churchId,
      receipt_number: receiptNumber,
      receipt_type: 'annual_statement',
      donation_id: null,
      tax_year: taxYear,
      total_amount_cents: total,
      donations_count: donations.length,
      person_id: personId,
      person_name_snapshot: personName,
      person_email_snapshot: person.email,
      status: 'generated',
      created_by: createdByUserId,
    })
    .select()
    .single();
  if (rErr) throw rErr;
  return receipt;
}
