// Stripe Connect (Express) helpers for the church-side CRM. Thin wrappers around
// the `stripe-connect` Edge Function. The church admin connects their OWN bank
// account so the portal can receive donations directly (direct charges).
import { supabase } from '../lib/supabase.js';

async function invoke(action, churchId, extra = {}) {
  const { data, error } = await supabase.functions.invoke('stripe-connect', {
    body: { action, churchId, origin: window.location.origin, ...extra },
  });
  if (error) {
    let msg = error.message;
    try { const j = JSON.parse(await error.context?.response?.text()); msg = j.message || j.error || msg; } catch { /* keep */ }
    throw new Error(msg);
  }
  return data;
}

// Returns { url } → redirect the admin to Stripe's hosted onboarding.
export const onboardStripe = (churchId) => invoke('onboard', churchId);

// Refreshes the account status from Stripe + persists it onto churches.
// Returns { connected, charges_enabled, payouts_enabled, details_submitted, requirements_due }.
export const refreshStripeStatus = (churchId) => invoke('status', churchId);

// Returns { url } → the Express Dashboard login link (open in a new tab).
export const openStripeDashboard = (churchId) => invoke('dashboard', churchId);
