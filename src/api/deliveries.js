import { supabase } from '../lib/supabase.js';

export const DELIVERY_STATUS_LABEL = {
  queued: 'En cola', sent: 'Enviado', delivered: 'Entregado',
  bounced: 'Rebotado', failed: 'Fallido', complained: 'Reportado',
};

export async function listDeliveriesForReceipt(receiptId) {
  const { data, error } = await supabase
    .from('receipt_deliveries')
    .select('id, delivery_channel, recipient_email, reason, reason_notes, status, sent_at, delivered_at, sent_by, external_message_id, error_message')
    .eq('receipt_id', receiptId)
    .order('sent_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
