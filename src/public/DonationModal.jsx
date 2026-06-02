import { useState, useEffect } from 'react';
import { DonationForm } from './DonationForm.jsx';
import { DonationThanks } from './DonationThanks.jsx';
import { DonationPaymentStep } from './DonationPaymentStep.jsx';
import { lockScroll, unlockScroll } from './smoothScroll.js';

export function DonationModal({ open, onClose, portalData, preselectedCampaignId = null, preselectedFundId = null, initialView = 'form', initialResult = null }) {
  const [view, setView] = useState(initialView); // 'form' | 'pay' | 'thanks'
  const [result, setResult] = useState(initialResult);
  const [payInfo, setPayInfo] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  // Honor the initial view/result when opening (e.g. returning from a redirect
  // payment straight into the "thanks" view); reset to a clean form on close.
  useEffect(() => {
    if (open) {
      setView(initialView);
      setResult(initialResult);
      setPayInfo(null);
    } else {
      setView('form');
      setResult(null);
      setPayInfo(null);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lockScroll();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      unlockScroll();
    };
  }, [open, onClose]);

  if (!open) return null;

  const scrollTop = () => document.querySelector('.pp-donation-modal-body')?.scrollTo({ top: 0, behavior: 'smooth' });

  const handleSuccess = (r) => {
    setResult(r);
    setView('thanks');
    scrollTop();
  };

  const handlePay = (info) => {
    setPayInfo(info);
    setView('pay');
    scrollTop();
  };

  const handlePaid = (r) => {
    setResult({ ...r, paid: true });
    setPayInfo(null);
    setView('thanks');
    scrollTop();
  };

  const handleAnother = () => {
    setView('form');
    setResult(null);
    setPayInfo(null);
    setResetKey((k) => k + 1);
  };

  const churchName = portalData?.church?.public_name || 'our church';
  const campaign = preselectedCampaignId
    ? portalData?.campaigns?.find((c) => c.id === preselectedCampaignId)
    : null;

  return (
    <div className="pp-donation-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Donation form">
      <div className="pp-donation-modal" onClick={(e) => e.stopPropagation()}>
        <header className="pp-donation-modal-header">
          <div>
            <h2 className="pp-donation-modal-title">
              {view === 'form' ? `Support the ministry of ${churchName}` : view === 'pay' ? 'Complete your gift' : 'Thank you!'}
            </h2>
            {view === 'form' && (
              <p className="pp-donation-modal-sub">
                {campaign
                  ? <>Your gift goes to the <strong>{campaign.name}</strong> campaign.</>
                  : 'Your generosity sustains the work.'}
              </p>
            )}
          </div>
          <button type="button" className="pp-donation-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="pp-donation-modal-body">
          {view === 'form' ? (
            <DonationForm
              key={resetKey}
              portalData={portalData}
              preselectedCampaignId={preselectedCampaignId}
              preselectedFundId={preselectedFundId}
              onSuccess={handleSuccess}
              onPay={handlePay}
            />
          ) : view === 'pay' ? (
            <DonationPaymentStep
              church={portalData?.church}
              payInfo={payInfo}
              onPaid={handlePaid}
              onBack={() => setView('form')}
            />
          ) : (
            <DonationThanks result={result} onAnother={handleAnother} />
          )}
        </div>
      </div>
    </div>
  );
}
