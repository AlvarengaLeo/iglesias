import { useState } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe, donationAppearance } from './stripe.js';

const money = (cents) => '$' + (Number(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// Step 2 of the donation modal: the on-portal Payment Element. Charges the
// church's connected Stripe account directly (the donor never leaves the page).
export function DonationPaymentStep({ church, payInfo, onPaid, onBack }) {
  const stripePromise = getStripe(church?.stripe_account_id);
  if (!stripePromise || !payInfo?.clientSecret) {
    const reason = !church?.stripe_account_id
      ? 'church stripe_account_id missing (onboarding incomplete or publishable key unset)'
      : !payInfo?.clientSecret
        ? 'no clientSecret returned from create-donation-payment'
        : 'stripe.js failed to initialize';
    if (typeof console !== 'undefined') console.error('DonationPaymentStep unavailable:', reason);
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: 'var(--pp-muted, #5E6573)' }}>
          We couldn&apos;t start the secure payment right now — your card was <strong>not</strong> charged.
          Please go back and try again in a moment.
        </p>
        <button type="button" className="pp-btn pp-btn-secondary" onClick={onBack}>Back</button>
      </div>
    );
  }
  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret: payInfo.clientSecret, appearance: donationAppearance(church?.primary_color) }}
    >
      <PayInner payInfo={payInfo} onPaid={onPaid} onBack={onBack} />
    </Elements>
  );
}

function PayInner({ payInfo, onPaid, onBack }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const freqLabel = payInfo.frequency === 'monthly' ? '/month' : payInfo.frequency === 'annual' ? '/year' : '';
  const amountLabel = money(payInfo.amountCents) + freqLabel;

  const submit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true); setErr(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (error) { setErr(error.message); setBusy(false); }
    else onPaid(payInfo.result);
  };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 14px', borderRadius: 12, background: 'var(--pp-bg-alt, #EAEEF4)',
        fontSize: 14,
      }}>
        <span style={{ color: 'var(--pp-muted, #5E6573)' }}>Your gift</span>
        <strong>{amountLabel} · {payInfo.destinationLabel}</strong>
      </div>

      <PaymentElement options={{ layout: 'tabs' }} />

      {err && (
        <div role="alert" style={{ color: 'var(--pp-error, #B4543F)', fontSize: 13, lineHeight: 1.4 }}>{err}</div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="pp-btn pp-btn-secondary" onClick={onBack} disabled={busy}>Back</button>
        <button type="submit" className="pp-btn pp-btn-primary" style={{ flex: 1 }} disabled={!stripe || busy}>
          {busy ? 'Processing…' : `Give ${amountLabel}`}
        </button>
      </div>

      <p style={{ fontSize: 12, color: 'var(--pp-muted, #5E6573)', textAlign: 'center', margin: 0 }}>
        Secured by Stripe · {payInfo.frequency === 'one_time' ? 'one-time gift' : 'recurring gift, cancel anytime'}
      </p>
    </form>
  );
}
