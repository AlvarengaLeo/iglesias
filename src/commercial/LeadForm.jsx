import { useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { Icon } from './Icon.jsx';

const ERR = {
  'church_name required': 'Please enter your church’s name.',
  'valid email required': 'Please enter a valid email address.',
  rate_limited: 'You just sent a request. Please wait a few minutes before trying again.',
};

export function LeadForm() {
  const [form, setForm] = useState({ church: '', name: '', email: '', phone: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.church.trim()) { setError(ERR['church_name required']); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) { setError(ERR['valid email required']); return; }
    setBusy(true);
    try {
      const { error: rpcErr } = await supabase.rpc('eb_submit_lead', {
        p_church_name: form.church.trim(),
        p_contact_name: form.name.trim() || null,
        p_email: form.email.trim(),
        p_phone: form.phone.trim() || null,
        p_source: 'commercial-site',
      });
      if (rpcErr) throw rpcErr;
      setDone(true);
    } catch (err) {
      const msg = err?.message || '';
      const key = Object.keys(ERR).find((k) => msg.includes(k));
      setError(key ? ERR[key] : 'Something went wrong. Please try again in a moment.');
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="eb-c-form-card eb-c-form-success" id="start">
        <div className="eb-c-form-success-ico"><Icon name="check" size={30} strokeWidth={2.2} /></div>
        <h3>You’re on the list.</h3>
        <p>Thanks, {form.name.trim() || 'friend'}. We’ve received your request for {form.church.trim()}. We’ll set up your account and reach out within one business day.</p>
      </div>
    );
  }

  return (
    <form className="eb-c-form-card" id="start" onSubmit={submit} noValidate>
      {error && <div className="eb-c-form-err" role="alert">{error}</div>}
      <div className="eb-c-field">
        <label htmlFor="lf-church">Church name <span className="eb-c-req">*</span></label>
        <input id="lf-church" type="text" autoComplete="organization" placeholder="Grace Community Church" value={form.church} onChange={set('church')} required />
      </div>
      <div className="eb-c-field">
        <label htmlFor="lf-name">Your name</label>
        <input id="lf-name" type="text" autoComplete="name" placeholder="Pastor Daniel Reyes" value={form.name} onChange={set('name')} />
      </div>
      <div className="eb-c-field">
        <label htmlFor="lf-email">Email <span className="eb-c-req">*</span></label>
        <input id="lf-email" type="email" autoComplete="email" placeholder="you@church.org" value={form.email} onChange={set('email')} required />
      </div>
      <div className="eb-c-field">
        <label htmlFor="lf-phone">Phone <span style={{ color: 'var(--pp-muted)', fontWeight: 500 }}>(optional)</span></label>
        <input id="lf-phone" type="tel" autoComplete="tel" placeholder="+1 (555) 123-4567" value={form.phone} onChange={set('phone')} />
      </div>
      <button className="eb-c-btn eb-c-btn--primary eb-c-btn--lg eb-c-btn--block" type="submit" disabled={busy}>
        {busy ? 'Sending…' : 'Start free trial'} {!busy && <Icon name="arrowRight" size={18} />}
      </button>
      <p className="eb-c-form-note">We’ll set up your account and reach out within one business day.</p>
    </form>
  );
}
