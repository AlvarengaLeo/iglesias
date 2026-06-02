import { supabase } from '../lib/supabase.js';

// =====================================================================
// Public Donations API — usada desde el portal anónimo
// =====================================================================
// Anon llama estas funciones SIN sesión. Toda la validación corre server-side
// dentro de rpc_create_public_donation_intent.

// Mapeo de códigos de error de la RPC a mensajes en español.
const ERROR_MESSAGES = {
  church_not_found_or_not_published: 'Esta iglesia no está disponible para recibir donaciones online.',
  invalid_amount: 'El monto debe estar entre $1 y $1,000,000.',
  invalid_frequency: 'La frecuencia seleccionada no es válida.',
  invalid_donor_type: 'El tipo de donante no es válido.',
  invalid_email: 'El correo electrónico no es válido.',
  individual_donor_requires_name: 'Indica tu nombre y apellido.',
  business_donor_requires_name: 'Indica el nombre legal de la empresa.',
  campaign_not_available: 'La campaña seleccionada ya no está disponible.',
  fund_not_available: 'El fondo seleccionado no está disponible.',
  no_default_fund_for_church: 'La iglesia no tiene un fondo por defecto configurado.',
  rate_limited: 'Has enviado varias intenciones recientemente. Espera unos minutos antes de intentar de nuevo.',
};

function friendlyError(err) {
  if (!err) return 'Error desconocido.';
  // Postgres lanza el mensaje del RAISE como `err.message`; el code va en err.code
  const code = err.message?.match(/[a-z_]+/)?.[0];
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[err.message] || err.message || 'No se pudo registrar la intención.';
}

/**
 * Crea una intención pública de donación.
 *
 * @param {object} payload
 * @param {string} payload.slug          - slug de la iglesia (de la URL del portal)
 * @param {number} payload.amount_cents
 * @param {'one_time'|'monthly'|'annual'} payload.frequency
 * @param {'individual'|'business'|'anonymous'} payload.donor_type
 * @param {string} payload.donor_email
 * @param {string} [payload.fund_id]
 * @param {string} [payload.campaign_id]
 * @param {string} [payload.donor_first_name]
 * @param {string} [payload.donor_last_name]
 * @param {string} [payload.donor_business_name]
 * @param {string} [payload.donor_contact_name]
 * @param {string} [payload.donor_phone]
 * @param {string} [payload.note]
 * @param {string} [payload.honeypot]    - debe quedar vacío; si tiene contenido la RPC lo dropea
 * @returns {Promise<{donation_intent_id, status, payment_available, next_action, provider_redirect_url, message}>}
 */
export async function createPublicDonationIntent(payload) {
  const args = {
    p_church_slug:          payload.slug,
    p_amount_cents:         payload.amount_cents,
    p_frequency:            payload.frequency,
    p_donor_type:           payload.donor_type,
    p_donor_email:          payload.donor_email,
    p_fund_id:              payload.fund_id || null,
    p_campaign_id:          payload.campaign_id || null,
    p_donor_first_name:     payload.donor_first_name || null,
    p_donor_last_name:      payload.donor_last_name || null,
    p_donor_business_name:  payload.donor_business_name || null,
    p_donor_contact_name:   payload.donor_contact_name || null,
    p_donor_phone:          payload.donor_phone || null,
    p_note:                 payload.note || null,
    p_honeypot:             payload.honeypot || null,
  };
  const { data, error } = await supabase.rpc('rpc_create_public_donation_intent', args);
  if (error) {
    const e = new Error(friendlyError(error));
    e.code = error.message;
    throw e;
  }
  return data;
}

/**
 * Convierte un id de intent en una referencia legible para el donor.
 * Ej: 'd8df28e9-1234-...' → 'DN-D8DF28E9'
 */
export function intentReference(intentId) {
  if (!intentId) return null;
  return 'DN-' + intentId.slice(0, 8).toUpperCase();
}

/**
 * Crea el cobro real (PaymentIntent único o Subscription recurrente) en la
 * cuenta Stripe conectada de la iglesia. Solo se llama cuando la iglesia tiene
 * Stripe activo (payment_available). Devuelve { clientSecret, mode }.
 */
export async function createDonationPayment({ slug, intentId, frequency }) {
  const { data, error } = await supabase.functions.invoke('create-donation-payment', {
    body: { slug, intentId, frequency },
  });
  if (error) {
    let msg = error.message;
    try { const j = JSON.parse(await error.context?.response?.text()); msg = j.message || j.error || msg; } catch { /* keep */ }
    throw new Error(msg || 'No se pudo iniciar el pago.');
  }
  return data;
}
