// EB Connect — create-donation-payment
// Public endpoint called by the portal donation modal AFTER a validated
// donation_intent has been created (rpc_create_public_donation_intent handles
// amount bounds, rate-limit, donor validation). Creates a real charge ON the
// church's connected account (Direct Charge — funds settle to the church's
// bank, no platform fee):
//   one-time         → PaymentIntent
//   monthly / annual → Subscription (default_incomplete) → its first
//                      PaymentIntent's client_secret
// Returns { clientSecret, mode } for the Payment Element. Fulfillment (recording
// the paid donation) happens ONLY in the verified stripe-connect-webhook.
import Stripe from 'npm:stripe@^17.0.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { jsonResponse, jsonError } from '../_shared/auth.ts';
import { handlePreflight } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const INTERVAL: Record<string, 'month' | 'year'> = { monthly: 'month', annual: 'year' };

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed');

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonError(400, 'invalid_json'); }
  const slug = String(body.slug ?? '').toLowerCase().trim();
  const intentId = String(body.intentId ?? '');
  if (!slug || !intentId) return jsonError(400, 'missing_params');

  // Church must be connected + charges-enabled.
  const { data: church } = await admin.from('churches')
    .select('id, public_name, stripe_account_id, stripe_charges_enabled')
    .eq('slug', slug).maybeSingle();
  if (!church?.stripe_account_id || !church.stripe_charges_enabled) {
    return jsonError(400, 'payments_not_available');
  }
  const acct = church.stripe_account_id as string;

  // Amount + donor come from the validated intent row (never trust the client).
  const { data: intent } = await admin.from('donation_intents')
    .select('id, church_id, amount_cents, currency, frequency, fund_id, campaign_id, donor_email, donor_first_name, donor_last_name, donor_business_name, status')
    .eq('id', intentId).maybeSingle();
  if (!intent || intent.church_id !== church.id) return jsonError(404, 'intent_not_found');
  if (!['pending_payment', 'payment_provider_pending'].includes(intent.status)) {
    return jsonError(409, 'intent_not_payable');
  }

  const amount = Number(intent.amount_cents);
  const currency = String(intent.currency ?? 'USD').toLowerCase();
  const frequency = String(intent.frequency ?? 'one_time');
  const donorName = [intent.donor_first_name, intent.donor_last_name].filter(Boolean).join(' ').trim()
    || intent.donor_business_name || 'Donante';
  const metadata: Record<string, string> = {
    church_id: church.id,
    intent_id: intent.id,
    fund_id: intent.fund_id ?? '',
    campaign_id: intent.campaign_id ?? '',
    donor_email: intent.donor_email ?? '',
    donor_name: donorName,
    frequency,
  };

  try {
    if (frequency === 'one_time') {
      const pi = await stripe.paymentIntents.create({
        amount,
        currency,
        automatic_payment_methods: { enabled: true },
        description: `Donación — ${church.public_name}`,
        // No application_fee_amount → the church keeps 100% (Stripe fee only).
        metadata,
      }, { stripeAccount: acct, idempotencyKey: `pi_${intent.id}` });

      await admin.from('donation_intents')
        .update({ status: 'payment_provider_pending', provider: 'stripe', provider_payment_intent_id: pi.id, updated_at: new Date().toISOString() })
        .eq('id', intent.id);

      return jsonResponse(200, { clientSecret: pi.client_secret, mode: 'payment' });
    }

    // Recurring (monthly / annual) — Subscription on the connected account.
    const interval = INTERVAL[frequency];
    if (!interval) return jsonError(400, 'bad_frequency');

    // Customer (per donor email, on the connected account).
    const existing = await stripe.customers.list({ email: intent.donor_email ?? undefined, limit: 1 }, { stripeAccount: acct });
    const customer = existing.data[0] ?? await stripe.customers.create(
      { email: intent.donor_email ?? undefined, name: donorName, metadata: { church_id: church.id } },
      { stripeAccount: acct },
    );

    // Price by stable lookup_key (handles arbitrary amounts; reused on repeat).
    const lookupKey = `don_${interval}_${amount}_${currency}`;
    let price = (await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 }, { stripeAccount: acct })).data[0];
    if (!price) {
      const product = await stripe.products.create(
        { name: `Donación recurrente — ${church.public_name}` },
        { stripeAccount: acct },
      );
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: amount,
        currency,
        recurring: { interval },
        lookup_key: lookupKey,
      }, { stripeAccount: acct });
    }

    const sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription', payment_method_types: ['card'] },
      expand: ['latest_invoice.payment_intent'],
      metadata,
    }, { stripeAccount: acct, idempotencyKey: `sub_${intent.id}` });

    const invoice = sub.latest_invoice as Stripe.Invoice;
    const pi = invoice?.payment_intent as Stripe.PaymentIntent | null;
    if (!pi?.client_secret) return jsonError(502, 'no_payment_intent');

    // Stamp the first PaymentIntent so the webhook has the metadata immediately.
    await stripe.paymentIntents.update(pi.id, { metadata: { ...metadata, subscription_id: sub.id } }, { stripeAccount: acct });

    await admin.from('donation_intents')
      .update({ status: 'payment_provider_pending', provider: 'stripe', provider_subscription_id: sub.id, provider_payment_intent_id: pi.id, updated_at: new Date().toISOString() })
      .eq('id', intent.id);

    return jsonResponse(200, { clientSecret: pi.client_secret, mode: 'subscription' });
  } catch (err) {
    console.error('create-donation-payment error', err);
    return jsonError(502, 'stripe_error', (err as Error).message);
  }
});
