import { supabase } from '../lib/supabase.js';

// Get full church row by ID. RLS ensures user can only read their own church.
export async function getChurch(churchId) {
  const { data, error } = await supabase
    .from('churches')
    .select('*')
    .eq('id', churchId)
    .single();
  if (error) throw error;
  return data;
}

// Update church with partial patch. Returns updated row.
// RLS enforces role IN ('admin','pastor') for the update.
export async function updateChurch(churchId, patch) {
  const { data, error } = await supabase
    .from('churches')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', churchId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update only receipt template fields. Convenience wrapper to avoid full payload.
export async function updateChurchReceiptTemplate(churchId, receiptPatch) {
  const allowed = {
    receipt_authorized_rep:    receiptPatch.receipt_authorized_rep,
    receipt_default_message:   receiptPatch.receipt_default_message,
    receipt_fiscal_notice:     receiptPatch.receipt_fiscal_notice,
    receipt_include_signature: receiptPatch.receipt_include_signature,
  };
  // strip undefined so we don't overwrite columns with null
  Object.keys(allowed).forEach((k) => allowed[k] === undefined && delete allowed[k]);
  return updateChurch(churchId, allowed);
}

// Update locale ('es' | 'en').
export async function updateChurchLocale(churchId, locale) {
  if (!['es', 'en'].includes(locale)) {
    throw new Error('Locale inválido. Debe ser "es" o "en".');
  }
  return updateChurch(churchId, { locale });
}

// Update only the logo URL. Pass null to clear.
export async function updateChurchLogoUrl(churchId, logoUrl) {
  return updateChurch(churchId, { logo_url: logoUrl });
}

// Update only the favicon URL (browser-tab icon of the public portal). null clears.
export async function updateChurchFaviconUrl(churchId, faviconUrl) {
  return updateChurch(churchId, { favicon_url: faviconUrl });
}
