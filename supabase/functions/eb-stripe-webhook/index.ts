// EB Connect — eb-stripe-webhook
// The ONLY place that fulfills (provisions churches, records payments, syncs
// subscription state). Stripe sends no Supabase JWT → deploy with
// `--no-verify-jwt`. Signature is verified on the RAW body (Web Crypto).
//
//   setup_intent.succeeded        → provision church + send admin invite
//   customer.subscription.updated → sync status/period/cancel
//   customer.subscription.deleted → mark canceled
//   invoice.payment_succeeded     → record paid payment, activate after trial
//   invoice.payment_failed        → record failed payment, mark past_due
//
// All handlers are idempotent (provision keyed on provider_subscription_id,
// payments keyed on provider_invoice_id) so Stripe retries are safe.
import Stripe from 'npm:stripe@^17.0.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});
const cryptoProvider = Stripe.createSubtleCryptoProvider();
const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const SITE_URL = Deno.env.get('SITE_URL') ?? 'http://localhost:5173';
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const iso = (epochSecs: number | null | undefined) =>
  epochSecs ? new Date(epochSecs * 1000).toISOString() : null;

function mapStatus(s: string): string {
  switch (s) {
    case 'trialing': return 'trialing';
    case 'active': return 'active';
    case 'past_due':
    case 'unpaid': return 'past_due';
    case 'canceled':
    case 'incomplete_expired': return 'canceled';
    case 'paused': return 'paused';
    default: return 'incomplete';
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 });
  const sig = req.headers.get('stripe-signature');
  const raw = await req.text(); // RAW body — required for signature verification
  if (!sig) return new Response('missing_signature', { status: 400 });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, WEBHOOK_SECRET, undefined, cryptoProvider);
  } catch (err) {
    return new Response(`bad_signature: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'setup_intent.succeeded': {
        const si = event.data.object as Stripe.SetupIntent;
        const m = si.metadata ?? {};
        if (!m.subscription_id || !m.admin_email || !m.church_name) break; // not our flow
        const sub = await stripe.subscriptions.retrieve(m.subscription_id);

        const { data: prov, error } = await admin.rpc('eb_provision_subscribed_church', {
          p_public_name: m.church_name,
          p_admin_email: m.admin_email,
          p_plan_code: m.plan_code || 'ministry',
          p_provider_customer_id: m.customer_id || (sub.customer as string),
          p_provider_subscription_id: sub.id,
          p_status: mapStatus(sub.status),
          p_trial_ends_at: iso(sub.trial_end),
          p_current_period_end: iso(sub.current_period_end),
        });
        if (error) throw error;

        // Make the saved card the subscription default (belt-and-suspenders).
        if (si.payment_method) {
          await stripe.subscriptions.update(sub.id, { default_payment_method: si.payment_method as string });
        }
        // Send the admin invite once (only on first provision for this sub).
        if (prov && !prov.already && prov.invitation_token) {
          const { error: invErr } = await admin.auth.admin.inviteUserByEmail(m.admin_email, {
            data: { invitation_token: prov.invitation_token, church_id: prov.church_id, role: 'admin', must_change_password: true },
            redirectTo: `${SITE_URL}/#accept-invite`,
          });
          if (invErr) console.error('invite error', invErr.message);
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await admin.rpc('eb_stripe_sync_subscription', {
          p_provider_subscription_id: sub.id,
          p_status: event.type === 'customer.subscription.deleted' ? 'canceled' : mapStatus(sub.status),
          p_current_period_end: iso(sub.current_period_end),
          p_cancel_at_period_end: !!sub.cancel_at_period_end,
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const inv = event.data.object as Stripe.Invoice;
        if (!inv.subscription || (inv.amount_paid ?? 0) <= 0) break; // skip $0 trial invoice
        await admin.rpc('eb_stripe_record_payment', {
          p_provider_subscription_id: inv.subscription as string,
          p_amount_cents: inv.amount_paid,
          p_status: 'paid',
          p_provider_payment_id: (inv.payment_intent as string) ?? null,
          p_provider_invoice_id: inv.id,
          p_paid_at: iso(inv.status_transitions?.paid_at) ?? new Date().toISOString(),
        });
        break;
      }

      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice;
        if (!inv.subscription) break;
        await admin.rpc('eb_stripe_record_payment', {
          p_provider_subscription_id: inv.subscription as string,
          p_amount_cents: inv.amount_due ?? 0,
          p_status: 'failed',
          p_provider_payment_id: (inv.payment_intent as string) ?? null,
          p_provider_invoice_id: inv.id,
          p_failure_reason: 'invoice.payment_failed',
        });
        break;
      }
    }
  } catch (err) {
    console.error('webhook handler error', event.type, (err as Error).message);
    return new Response('handler_error', { status: 500 }); // Stripe will retry
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
});
