// EB Connect — eb-create-subscription
// Public (anon) endpoint called from the commercial site's checkout modal.
// Creates a Stripe Customer + 14-day-trial Subscription with payment_behavior
// 'default_incomplete' → Stripe issues a SetupIntent (no charge during trial) to
// save the card for the first charge after the trial. Returns the SetupIntent
// client_secret so the Payment Element can confirm it ON the site.
//
// Fulfillment (provisioning the church) happens ONLY from the verified webhook.
import Stripe from 'npm:stripe@^17.0.0';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { jsonResponse, jsonError } from '../_shared/auth.ts';
import { handlePreflight } from '../_shared/cors.ts';

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});
const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed');

  let body: Record<string, string>;
  try { body = await req.json(); } catch { return jsonError(400, 'invalid_json'); }
  const churchName = (body.churchName ?? '').trim();
  const email = (body.email ?? '').trim().toLowerCase();
  const planCode = (body.planCode ?? 'ministry').trim();
  const idempotencyKey = (body.idempotencyKey ?? crypto.randomUUID()).trim();

  if (churchName.length < 2) return jsonError(400, 'church_name_required');
  if (!EMAIL_RX.test(email)) return jsonError(400, 'invalid_email');

  // Plan price comes from the DB (service role; eb_plans is staff-RLS).
  const { data: plan, error: pErr } = await admin
    .from('eb_plans')
    .select('code,name,monthly_price_cents,currency')
    .eq('code', planCode).eq('is_active', true).maybeSingle();
  if (pErr || !plan) return jsonError(400, 'plan_not_found', pErr?.message);

  try {
    // Reuse an existing customer for this email, else create one.
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer = existing.data[0] ?? await stripe.customers.create({
      email, name: churchName, metadata: { church_name: churchName, plan_code: planCode },
    });

    // Subscriptions need a real Price id (not inline product_data). Find or
    // create the recurring Price once, keyed by a stable lookup_key.
    const lookupKey = `eb_${planCode}_monthly`;
    let price = (await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })).data[0];
    if (!price) {
      const product = await stripe.products.create({ name: `EB Connect — ${plan.name}` });
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthly_price_cents,
        currency: (plan.currency ?? 'usd').toLowerCase(),
        recurring: { interval: 'month' },
        lookup_key: lookupKey,
      });
    }

    const sub = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      trial_period_days: 14,
      payment_behavior: 'default_incomplete',
      // Card only (covers Apple Pay / Google Pay / Link automatically). Other
      // methods Stripe enables by default (Klarna, Cash App, Amazon Pay, ACH)
      // aren't reliable for off-session recurring trial charges → we hide them.
      payment_settings: {
        save_default_payment_method: 'on_subscription',
        payment_method_types: ['card'],
      },
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      expand: ['pending_setup_intent'],
      metadata: { church_name: churchName, admin_email: email, plan_code: planCode },
    }, { idempotencyKey });

    const si = sub.pending_setup_intent as Stripe.SetupIntent | null;
    if (!si?.client_secret) return jsonError(500, 'no_setup_intent');

    // Stamp the SetupIntent so the webhook can provision from setup_intent.succeeded.
    await stripe.setupIntents.update(si.id, {
      metadata: {
        church_name: churchName, admin_email: email, plan_code: planCode,
        subscription_id: sub.id, customer_id: customer.id,
      },
    });

    return jsonResponse(200, { clientSecret: si.client_secret, subscriptionId: sub.id });
  } catch (err) {
    console.error('create-subscription error', err);
    return jsonError(502, 'stripe_error', (err as Error).message);
  }
});
