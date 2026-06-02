import { useState, useEffect, useCallback } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '../../lib/supabase.js';
import { stripePromise, stripeAppearance } from './stripe.js';
import { Icon } from '../Icon.jsx';

const EMAIL_RX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PERKS = [
  'Online giving & tax receipts',
  'Member & supporter CRM',
  'A complete church website',
  'Real-time giving dashboards',
];

// On-site subscription checkout, designed as a true extension of the site:
// a cobalt brand/value aside (echoing the hero & pricing) + the form panel.
// Step 1 (church + email) creates the trialing Stripe subscription (SetupIntent);
// step 2 mounts the Payment Element and confirms it without leaving the page.
export function CheckoutModal({ open, onClose }) {
  const [step, setStep] = useState('form'); // form | pay | done
  const [churchName, setChurchName] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState(null);
  // payStatus rige la creación de la suscripción en segundo plano mientras la UI
  // ya muestra el paso 2: idle → creating → ready | failed.
  const [payStatus, setPayStatus] = useState('idle');
  const [clientSecret, setClientSecret] = useState(null);
  const [idemKey] = useState(() => crypto.randomUUID());

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, close]);

  if (!open) return null;

  const startPayment = async (e) => {
    e.preventDefault();
    if (payStatus === 'creating') return; // evita doble-submit
    setErr(null);
    if (churchName.trim().length < 2) { setErr('Please enter your church’s name.'); return; }
    if (!EMAIL_RX.test(email)) { setErr('Please enter a valid email address.'); return; }
    if (!stripePromise) { setErr('Payments aren’t enabled yet. Please check back soon.'); return; }
    // Avanzamos la UI al paso 2 de inmediato (con skeleton) y creamos la
    // suscripción en segundo plano, para que el clic se sienta instantáneo.
    setPayStatus('creating');
    setStep('pay');
    try {
      const { data, error } = await supabase.functions.invoke('eb-create-subscription', {
        body: { churchName: churchName.trim(), email: email.trim().toLowerCase(), idempotencyKey: idemKey },
      });
      if (error) {
        let m = error.message;
        try { const t = await error.context?.response?.text(); const j = JSON.parse(t); m = j.message || j.error || m; } catch { /* keep */ }
        throw new Error(m);
      }
      setClientSecret(data.clientSecret);
      setPayStatus('ready');
    } catch (e2) {
      // Volvemos al paso 1 con los datos intactos y el error visible. El idemKey
      // se reusa, así que reintentar NO duplica la suscripción.
      setErr(e2.message || 'Something went wrong. Please try again.');
      setPayStatus('failed');
      setStep('form');
    }
  };

  return (
    <div className="eb-c-modal-overlay" onClick={close} role="dialog" aria-modal="true" aria-label="Start your free trial">
      <div className="eb-c-co" onClick={(e) => e.stopPropagation()}>
        <button className="eb-c-co-close" onClick={close} aria-label="Close"><Icon name="x" size={18} /></button>

        <aside className="eb-c-co-aside">
          <div className="eb-c-co-brand">
            <img className="eb-c-logo eb-c-logo--white" src="/logo-web.png" alt="EB Connect" style={{ height: '26px' }} />
          </div>
          <div>
            <span className="eb-c-co-eyebrow">14-day free trial</span>
            <div className="eb-c-co-price"><b>$25</b><span>/ month</span></div>
            <p className="eb-c-co-tagline">Everything your church needs, all in one place: giving, people, and a beautiful website.</p>
            <ul className="eb-c-co-list">
              {PERKS.map((p) => (
                <li key={p}><span className="ic"><Icon name="check" size={12} strokeWidth={2.6} /></span>{p}</li>
              ))}
            </ul>
          </div>
          <div className="eb-c-co-trust"><Icon name="shield" size={14} /> No charge for 14 days · cancel anytime</div>
        </aside>

        <div className="eb-c-co-main">
          {step === 'form' && (
            <form onSubmit={startPayment}>
              <span className="eb-c-co-step">Step 1 of 2 · Your church</span>
              <h3 className="eb-c-co-title">Let’s set up your account</h3>
              <p className="eb-c-co-sub">We’ll create your church and email you a link to finish. It takes a minute.</p>
              {err && <div className="eb-c-form-err" role="alert">{err}</div>}
              <label className="eb-c-field"><span>Church name <span className="eb-c-req">*</span></span>
                <input type="text" autoComplete="organization" placeholder="Grace Community Church" value={churchName} onChange={(e) => setChurchName(e.target.value)} autoFocus />
              </label>
              <label className="eb-c-field"><span>Email <span className="eb-c-req">*</span></span>
                <input type="email" autoComplete="email" placeholder="you@church.org" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <button className="eb-c-btn eb-c-btn--primary eb-c-btn--lg eb-c-btn--block" type="submit" disabled={payStatus === 'creating'}>
                Continue to payment <Icon name="arrowRight" size={18} />
              </button>
              <p className="eb-c-form-note">Secure checkout by Stripe · you never leave this page.</p>
            </form>
          )}

          {step === 'pay' && payStatus === 'ready' && clientSecret && (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
              <PayStep onDone={() => setStep('done')} />
            </Elements>
          )}

          {step === 'pay' && payStatus !== 'ready' && (
            <div>
              <span className="eb-c-co-step">Step 2 of 2 · Payment</span>
              <h3 className="eb-c-co-title">Add your card</h3>
              <p className="eb-c-co-sub">You won’t be charged for 14 days. Cancel anytime before then.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '8px 0 16px' }} aria-hidden="true">
                <div style={{ height: 44, borderRadius: 12, background: '#EEF0F3' }} />
                <div style={{ height: 44, borderRadius: 12, background: '#EEF0F3' }} />
                <div style={{ height: 44, borderRadius: 12, background: '#EEF0F3', width: '55%' }} />
              </div>
              <button className="eb-c-btn eb-c-btn--primary eb-c-btn--lg eb-c-btn--block" type="button" disabled>
                Preparing secure checkout…
              </button>
            </div>
          )}

          {step === 'done' && (
            <div className="eb-c-form-success">
              <div className="eb-c-form-success-ico"><Icon name="check" size={30} strokeWidth={2.2} /></div>
              <h3>Your trial is set!</h3>
              <p>No charge for 14 days. We’ve emailed a link to <strong>{email}</strong> to finish setting up <strong>{churchName}</strong> and access your dashboard.</p>
              <button className="eb-c-btn eb-c-btn--primary eb-c-btn--block" style={{ marginTop: 18 }} onClick={close}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PayStep({ onDone }) {
  const stripe = useStripe();
  const elements = useElements();
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true); setErr(null);
    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.origin + '/landing.html?checkout=done' },
      redirect: 'if_required',
    });
    if (error) { setErr(error.message); setBusy(false); }
    else onDone();
  };

  return (
    <form onSubmit={submit}>
      <span className="eb-c-co-step">Step 2 of 2 · Payment</span>
      <h3 className="eb-c-co-title">Add your card</h3>
      <p className="eb-c-co-sub">You won’t be charged for 14 days. Cancel anytime before then.</p>
      <div style={{ margin: '8px 0 16px' }}><PaymentElement options={{ layout: 'tabs' }} /></div>
      {err && <div className="eb-c-form-err" role="alert">{err}</div>}
      <button className="eb-c-btn eb-c-btn--primary eb-c-btn--lg eb-c-btn--block" type="submit" disabled={!stripe || busy}>
        {busy ? 'Processing…' : 'Start 14-day trial'}
      </button>
      <p className="eb-c-form-note">$25/month begins after your 14-day trial.</p>
    </form>
  );
}
