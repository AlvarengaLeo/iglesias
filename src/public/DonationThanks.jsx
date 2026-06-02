import { intentReference } from '../api/publicDonations.js';

export function DonationThanks({ result, onAnother }) {
  const ref = intentReference(result?.donation_intent_id);
  // Force English copy on the public site (the RPC message may be localized).
  const message = result?.paid
    ? 'Your gift was processed successfully — thank you! A receipt is on its way to your email.'
    : 'Your donation has been registered. The church will reach out by email or phone to complete your gift.';

  return (
    <div className="pp-thanks-panel">
      <div className="pp-thanks-check" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h2 className="pp-thanks-title">Thank you for your generosity</h2>
      <p className="pp-thanks-message">{message}</p>

      {ref && (
        <div className="pp-thanks-ref">
          <span className="pp-thanks-ref-label">Reference</span>
          <span className="pp-thanks-ref-code">{ref}</span>
        </div>
      )}

      <button type="button" className="pp-btn pp-btn-secondary pp-thanks-cta" onClick={onAnother}>
        Make another gift
      </button>
    </div>
  );
}
