// EB Connect — stripe-connect
// Authenticated endpoint (church admin/treasurer). Manages the church's Stripe
// Connect *Express* account so they can receive donations into THEIR bank:
//   action=onboard   → create the Express account (once) + a hosted Account Link
//   action=status    → refresh charges/payouts/details + persist to churches
//   action=dashboard → Express Dashboard login link
// The platform uses its own STRIPE_SECRET_KEY; the connected account id is passed
// per-call. Fulfillment of donations happens in stripe-connect-webhook.
import Stripe from 'npm:stripe@^17.0.0';
import { authenticate, jsonResponse, jsonError } from '../_shared/auth.ts';
import { handlePreflight } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
});

function appOrigin(body: Record<string, unknown>): string {
  const o = String(body.origin ?? '');
  if (/^https?:\/\/[^\s]+$/.test(o)) return o.replace(/\/$/, '');
  return (Deno.env.get('APP_URL') ?? 'http://localhost:5180').replace(/\/$/, '');
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return jsonError(405, 'method_not_allowed');

  const ctx = await authenticate(req);
  if (ctx instanceof Response) return ctx;
  const { adminClient, callerUser } = ctx;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonError(400, 'invalid_json'); }
  const action = String(body.action ?? '');
  const churchId = String(body.churchId ?? '');
  if (!churchId) return jsonError(400, 'church_id_required');

  // Caller must be admin/treasurer of this church.
  const { data: membership } = await adminClient
    .from('church_users').select('role,is_active')
    .eq('user_id', callerUser.id).eq('church_id', churchId).maybeSingle();
  if (!membership?.is_active || !['admin', 'treasurer'].includes(membership.role)) {
    return jsonError(403, 'forbidden');
  }

  const { data: church, error: cErr } = await adminClient
    .from('churches')
    .select('id, public_name, slug, email, stripe_account_id, stripe_charges_enabled')
    .eq('id', churchId).maybeSingle();
  if (cErr || !church) return jsonError(404, 'church_not_found');

  try {
    if (action === 'onboard') {
      let accountId = church.stripe_account_id as string | null;
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: church.email ?? undefined,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_profile: { name: church.public_name },
          metadata: { church_id: church.id, church_slug: church.slug },
        });
        accountId = account.id;
        await adminClient.from('churches')
          .update({ stripe_account_id: accountId, updated_at: new Date().toISOString() })
          .eq('id', church.id);
      }

      const origin = appOrigin(body);
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: 'account_onboarding',
        refresh_url: `${origin}/index.html?stripe=refresh#configuracion`,
        return_url: `${origin}/index.html?stripe=done#configuracion`,
      });
      return jsonResponse(200, { url: link.url });
    }

    if (action === 'status') {
      if (!church.stripe_account_id) return jsonResponse(200, { connected: false });
      const acct = await stripe.accounts.retrieve(church.stripe_account_id as string);
      await adminClient.rpc('rpc_set_church_stripe_status', {
        p_account_id: acct.id,
        p_charges: acct.charges_enabled,
        p_payouts: acct.payouts_enabled,
        p_details: acct.details_submitted,
        p_requirements: acct.requirements ?? null,
      });
      return jsonResponse(200, {
        connected: true,
        charges_enabled: acct.charges_enabled,
        payouts_enabled: acct.payouts_enabled,
        details_submitted: acct.details_submitted,
        requirements_due: (acct.requirements?.currently_due ?? []).length,
      });
    }

    if (action === 'dashboard') {
      if (!church.stripe_account_id) return jsonError(400, 'not_connected');
      const loginLink = await stripe.accounts.createLoginLink(church.stripe_account_id as string);
      return jsonResponse(200, { url: loginLink.url });
    }

    return jsonError(400, 'unknown_action');
  } catch (err) {
    console.error('stripe-connect error', err);
    return jsonError(502, 'stripe_error', (err as Error).message);
  }
});
