import { useState, useMemo, useEffect } from 'react';
import { createPublicDonationIntent, createDonationPayment } from '../api/publicDonations.js';
import { formatMoney } from '../lib/money.js';

const AMOUNT_PRESETS = [500, 1000, 2500, 5000, 10000]; // in cents
const FREQUENCY_OPTIONS = [
  { value: 'one_time', label: 'One time', hint: 'A single gift' },
  { value: 'monthly',  label: 'Monthly',  hint: 'Every month' },
  { value: 'annual',   label: 'Annual',   hint: 'Once a year' },
];

export function DonationForm({ portalData, preselectedCampaignId = null, preselectedFundId = null, onSuccess, onPay }) {
  const { church, funds = [], campaigns = [] } = portalData || {};
  // When the church has Stripe connected, the gift is charged on the next step
  // (instant). Otherwise it's recorded as an intent the church confirms later.
  const paymentAvailable = !!(portalData?.payment_available && church?.stripe_account_id);

  const [amountChoice, setAmountChoice] = useState(2500);
  const [customAmount, setCustomAmount] = useState('');
  const [frequency, setFrequency]   = useState('one_time');
  const [destType, setDestType]     = useState(preselectedCampaignId ? 'campaign' : 'fund');
  const [fundId, setFundId]         = useState(preselectedFundId || funds.find((f) => f.is_default)?.id || funds[0]?.id || null);
  const [campaignId, setCampaignId] = useState(preselectedCampaignId);
  const [donorType, setDonorType]   = useState('individual');
  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName]   = useState('');
  const [email, setEmail]   = useState('');
  const [phone, setPhone]   = useState('');
  const [note, setNote]     = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Preselect a campaign (lock destination to campaign mode)
  useEffect(() => {
    if (preselectedCampaignId) {
      setDestType('campaign');
      setCampaignId(preselectedCampaignId);
    }
  }, [preselectedCampaignId]);

  // Preselect a fund (e.g. "Give" from a project linked to a fund)
  useEffect(() => {
    if (preselectedFundId && !preselectedCampaignId) {
      setDestType('fund');
      setFundId(preselectedFundId);
      setCampaignId(null);
    }
  }, [preselectedFundId, preselectedCampaignId]);

  const amountCents = useMemo(() => {
    if (customAmount) {
      const parsed = Math.round(parseFloat(customAmount.replace(/[^0-9.]/g, '')) * 100);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
    return amountChoice;
  }, [customAmount, amountChoice]);

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId),
    [campaignId, campaigns],
  );

  const selectedFund = useMemo(() => {
    if (destType === 'campaign' && selectedCampaign?.fund_id) {
      return funds.find((f) => f.id === selectedCampaign.fund_id) || funds.find((f) => f.is_default);
    }
    return funds.find((f) => f.id === fundId) || funds.find((f) => f.is_default);
  }, [destType, selectedCampaign, fundId, funds]);

  const destinationLabel = destType === 'campaign'
    ? (selectedCampaign?.name || 'Campaign')
    : (selectedFund?.name || 'General Fund');

  const frequencyLabel = FREQUENCY_OPTIONS.find((o) => o.value === frequency)?.label;

  const errors = {};
  if (amountCents < 100) errors.amount = 'Minimum $1';
  if (amountCents > 100000000) errors.amount = 'Maximum $1,000,000';
  if (donorType === 'individual') {
    if (!firstName.trim()) errors.firstName = 'Required';
    if (!lastName.trim())  errors.lastName = 'Required';
  }
  if (donorType === 'business') {
    if (!businessName.trim()) errors.businessName = 'Required';
  }
  if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    errors.email = 'Invalid email';
  }
  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createPublicDonationIntent({
        slug: church.slug,
        amount_cents: amountCents,
        frequency,
        donor_type: donorType,
        donor_email: email.trim().toLowerCase(),
        fund_id: destType === 'fund' ? fundId : null,
        campaign_id: destType === 'campaign' ? campaignId : null,
        donor_first_name: donorType === 'individual' ? firstName.trim() : null,
        donor_last_name:  donorType === 'individual' ? lastName.trim() : null,
        donor_business_name: donorType === 'business' ? businessName.trim() : null,
        donor_contact_name:  donorType === 'business' ? (contactName.trim() || null) : null,
        donor_phone: phone.trim() || null,
        note: note.trim() || null,
        honeypot,
      });

      // If the church has Stripe connected, take the payment now (direct charge
      // to their account). Otherwise fall back to the intent-only flow.
      if (portalData?.payment_available && church?.stripe_account_id && onPay) {
        const pay = await createDonationPayment({
          slug: church.slug,
          intentId: result.donation_intent_id,
          frequency,
        });
        onPay({ ...pay, result, amountCents, frequency, destinationLabel });
      } else {
        onSuccess(result);
      }
    } catch (e) {
      setError(e.message || 'We could not process your gift. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="pp-donation-form" onSubmit={handleSubmit} noValidate>
      <div className="pp-donation-grid">
        <div className="pp-donation-main">
          {/* AMOUNT */}
          <section className="pp-donation-section">
            <h3 className="pp-donation-h3">How much would you like to give?</h3>
            <div className="pp-amount-chips">
              {AMOUNT_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`pp-amount-chip ${!customAmount && amountChoice === c ? 'pp-amount-chip-active' : ''}`}
                  onClick={() => { setAmountChoice(c); setCustomAmount(''); }}
                >
                  {formatMoney(c)}
                </button>
              ))}
              <div className="pp-amount-custom">
                <span className="pp-amount-custom-prefix">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Other amount"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  aria-label="Other amount"
                />
              </div>
            </div>
            {errors.amount && <p className="pp-donation-error-inline">{errors.amount}</p>}
          </section>

          {/* FREQUENCY */}
          <section className="pp-donation-section">
            <h3 className="pp-donation-h3">How often?</h3>
            <div className="pp-freq-group">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`pp-freq-toggle ${frequency === opt.value ? 'pp-freq-toggle-active' : ''}`}
                  onClick={() => setFrequency(opt.value)}
                >
                  <span className="pp-freq-label">{opt.label}</span>
                  <span className="pp-freq-hint">{opt.hint}</span>
                </button>
              ))}
            </div>
          </section>

          {/* DESTINATION */}
          <section className="pp-donation-section">
            <h3 className="pp-donation-h3">Where should your gift go?</h3>
            <div className="pp-destination-list">
              {funds.length > 0 && (
                <label className={`pp-dest-card ${destType === 'fund' && fundId === (funds.find((f) => f.is_default)?.id) ? 'pp-dest-card-active' : ''}`}>
                  <input
                    type="radio"
                    name="destination"
                    checked={destType === 'fund' && fundId === (funds.find((f) => f.is_default)?.id)}
                    onChange={() => {
                      setDestType('fund');
                      setFundId(funds.find((f) => f.is_default)?.id || funds[0]?.id);
                      setCampaignId(null);
                    }}
                  />
                  <div className="pp-dest-body">
                    <div className="pp-dest-title">General Fund</div>
                    <div className="pp-dest-sub">Where the church needs it most</div>
                  </div>
                </label>
              )}

              {campaigns.map((c) => (
                <label key={c.id} className={`pp-dest-card ${destType === 'campaign' && campaignId === c.id ? 'pp-dest-card-active' : ''}`}>
                  <input
                    type="radio"
                    name="destination"
                    checked={destType === 'campaign' && campaignId === c.id}
                    onChange={() => {
                      setDestType('campaign');
                      setCampaignId(c.id);
                    }}
                  />
                  <div className="pp-dest-body">
                    <div className="pp-dest-title">{c.name}</div>
                    {c.description && <div className="pp-dest-sub">{c.description}</div>}
                  </div>
                </label>
              ))}

              {funds.filter((f) => !f.is_default).map((f) => (
                <label key={f.id} className={`pp-dest-card ${destType === 'fund' && fundId === f.id ? 'pp-dest-card-active' : ''}`}>
                  <input
                    type="radio"
                    name="destination"
                    checked={destType === 'fund' && fundId === f.id}
                    onChange={() => {
                      setDestType('fund');
                      setFundId(f.id);
                      setCampaignId(null);
                    }}
                  />
                  <div className="pp-dest-body">
                    <div className="pp-dest-title">{f.name}</div>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* WHO'S GIVING */}
          <section className="pp-donation-section">
            <h3 className="pp-donation-h3">Who's giving?</h3>
            <div className="pp-donor-toggle">
              <button
                type="button"
                className={`pp-donor-tab ${donorType === 'individual' ? 'pp-donor-tab-active' : ''}`}
                onClick={() => setDonorType('individual')}
              >
                Person
              </button>
              <button
                type="button"
                className={`pp-donor-tab ${donorType === 'business' ? 'pp-donor-tab-active' : ''}`}
                onClick={() => setDonorType('business')}
              >
                Business
              </button>
            </div>

            <div className="pp-donor-fields">
              {donorType === 'individual' ? (
                <>
                  <div className="pp-field">
                    <label>First name *</label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
                    {errors.firstName && <span className="pp-donation-error-inline">{errors.firstName}</span>}
                  </div>
                  <div className="pp-field">
                    <label>Last name *</label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
                    {errors.lastName && <span className="pp-donation-error-inline">{errors.lastName}</span>}
                  </div>
                </>
              ) : (
                <>
                  <div className="pp-field pp-field-wide">
                    <label>Business legal name *</label>
                    <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} autoComplete="organization" />
                    {errors.businessName && <span className="pp-donation-error-inline">{errors.businessName}</span>}
                  </div>
                  <div className="pp-field pp-field-wide">
                    <label>Contact person</label>
                    <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                  </div>
                </>
              )}

              <div className="pp-field pp-field-wide">
                <label>Email *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                {errors.email && <span className="pp-donation-error-inline">{errors.email}</span>}
                <span className="pp-field-hint">This is where you'll receive your receipt once we confirm your gift.</span>
              </div>

              <div className="pp-field pp-field-wide">
                <label>Phone (optional)</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="(305) 555-0000" />
              </div>
            </div>
          </section>

          {/* OPTIONAL MESSAGE */}
          <section className="pp-donation-section">
            <h3 className="pp-donation-h3">Want to leave a message?</h3>
            <textarea
              className="pp-donation-textarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Share a prayer request, dedication, or a note for the pastoral team."
              rows={3}
              maxLength={500}
            />
          </section>

          {/* Hidden honeypot (anti-bot) */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
            aria-hidden="true"
          />
        </div>

        {/* Sticky summary */}
        <aside className="pp-donation-summary">
          <div className="pp-summary-inner">
            <div className="pp-summary-title">Summary</div>
            <div className="pp-summary-row">
              <span className="pp-summary-label">Amount</span>
              <span className="pp-summary-value pp-summary-amount">
                {formatMoney(amountCents)}
                {frequency !== 'one_time' && <span className="pp-summary-freq-suffix">/{frequency === 'monthly' ? 'mo' : 'yr'}</span>}
              </span>
            </div>
            <div className="pp-summary-row">
              <span className="pp-summary-label">Frequency</span>
              <span className="pp-summary-value">{frequencyLabel}</span>
            </div>
            <div className="pp-summary-row">
              <span className="pp-summary-label">Destination</span>
              <span className="pp-summary-value">{destinationLabel}</span>
            </div>

            <div className="pp-summary-note">
              {paymentAvailable
                ? "You'll enter your card on the next step — secured by Stripe. Your receipt is emailed right away."
                : 'Your receipt will be issued once the church confirms your gift.'}
            </div>

            {error && <div className="pp-donation-error-box">{error}</div>}

            <button
              type="submit"
              className="pp-btn pp-btn-primary pp-btn-submit"
              disabled={!isValid || submitting}
            >
              {paymentAvailable
                ? (submitting ? 'Preparing payment…' : 'Continue to payment →')
                : (submitting ? 'Submitting…' : 'Submit my gift')}
            </button>
            <p className="pp-summary-tax">
              {paymentAvailable ? 'Your gift is tax-deductible.' : 'Your gift is tax-deductible once confirmed.'}
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}
