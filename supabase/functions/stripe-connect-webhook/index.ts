// EB Connect — stripe-connect-webhook
// THE ONLY place that fulfills Connect events (account status + donations).
// Listens to events on CONNECTED accounts (each event carries event.account).
// Signature verified on the RAW body with STRIPE_CONNECT_WEBHOOK_SECRET.
//   account.updated          → sync charges/payouts/details onto churches
//   payment_intent.succeeded → record a one-time donation (no invoice)
//   invoice.payment_succeeded→ record a recurring-cycle donation
//   customer.subscription.deleted → mark the recurring profile canceled
import Stripe from 'npm:stripe@^17.0.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const WEBHOOK_SECRET = Deno.env.get('STRIPE_CONNECT_WEBHOOK_SECRET')!;
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const nn = (v: string | null | undefined) => (v && v.length ? v : null);

async function recordDonation(opts: {
  meta: Record<string, string>;
  amount: number;
  piId: string;
  chargeId: string | null;
  paymentMethod: string;
  subscriptionId: string | null;
  paidAt: number;
}) {
  const { meta, amount, piId, chargeId, paymentMethod, subscriptionId, paidAt } = opts;
  if (!meta.church_id || !amount || !piId) return;
  await admin.rpc('rpc_complete_donation_from_payment', {
    p_church_id: meta.church_id,
    p_amount_cents: amount,
    p_stripe_payment_intent_id: piId,
    p_stripe_charge_id: chargeId,
    p_payment_method: paymentMethod || 'card',
    p_frequency: meta.frequency || 'one_time',
    p_fund_id: nn(meta.fund_id),
    p_campaign_id: nn(meta.campaign_id),
    p_donor_name: nn(meta.donor_name),
    p_donor_email: nn(meta.donor_email),
    p_intent_id: nn(meta.intent_id),
    p_stripe_subscription_id: subscriptionId,
    p_paid_at: new Date(paidAt * 1000).toISOString(),
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 });
  const sig = req.headers.get('stripe-signature');
  const raw = await req.text();
  if (!sig) return new Response('missing_signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, WEBHOOK_SECRET, undefined, cryptoProvider);
  } catch (err) {
    return new Response(`bad_signature: ${(err as Error).message}`, { status: 400 });
  }

  // Idempotency ledger: skip events we've already fully processed. The row is
  // written AFTER successful handling (below), so a handler that fails returns
  // 5xx and Stripe safely retries the same event.
  const { data: alreadyProcessed } = await admin
    .from('stripe_webhook_events').select('event_id').eq('event_id', event.id).maybeSingle();
  if (alreadyProcessed) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  const account = event.account; // connected account id (acct_...)

  try {
    switch (event.type) {
      case 'account.updated': {
        const acct = event.data.object as Stripe.Account;
        await admin.rpc('rpc_set_church_stripe_status', {
          p_account_id: acct.id,
          p_charges: acct.charges_enabled,
          p_payouts: acct.payouts_enabled,
          p_details: acct.details_submitted,
          p_requirements: acct.requirements ?? null,
        });
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        // Subscription invoices fire this too — those are handled via invoice.*.
        if (pi.invoice) break;
        const charge = typeof pi.latest_charge === 'string' ? pi.latest_charge : (pi.latest_charge?.id ?? null);
        await recordDonation({
          meta: (pi.metadata ?? {}) as Record<string, string>,
          amount: pi.amount_received || pi.amount,
          piId: pi.id,
          chargeId: charge,
          paymentMethod: pi.payment_method_types?.[0] ?? 'card',
          subscriptionId: null,
          paidAt: pi.created,
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const inv = event.data.object as Stripe.Invoice;
        if (!inv.subscription || !inv.payment_intent || !account) break;
        const subId = typeof inv.subscription === 'string' ? inv.subscription : inv.subscription.id;
        const piId = typeof inv.payment_intent === 'string' ? inv.payment_intent : inv.payment_intent.id;
        const chargeId = typeof inv.charge === 'string' ? inv.charge : (inv.charge?.id ?? null);
        // Subscription carries the donation metadata (set at creation).
        const sub = await stripe.subscriptions.retrieve(subId, { stripeAccount: account });
        await recordDonation({
          meta: (sub.metadata ?? {}) as Record<string, string>,
          amount: inv.amount_paid,
          piId,
          chargeId,
          paymentMethod: 'card',
          subscriptionId: subId,
          paidAt: inv.status_transitions?.paid_at ?? inv.created,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await admin.from('recurring_donation_profiles')
          .update({ status: 'canceled', canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    // Return 5xx so Stripe RETRIES (exponential backoff, up to ~3 days). A
    // transient DB failure must NOT silently drop a real, already-captured
    // donation. Retries are safe: fulfillment is idempotent (the donations
    // UNIQUE index on stripe_payment_intent_id), and the event is only recorded
    // as processed below on success.
    console.error('stripe-connect-webhook handler error', event.type, (err as Error).message);
    return new Response('handler_error', { status: 500 });
  }

  // Mark processed (best-effort; the donations UNIQUE index is the hard guard).
  try {
    await admin.from('stripe_webhook_events').insert({ event_id: event.id, event_type: event.type });
  } catch (_) { /* already recorded by a concurrent delivery — fine */ }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
