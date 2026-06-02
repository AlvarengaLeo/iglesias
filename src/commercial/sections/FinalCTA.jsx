import { Icon } from '../Icon.jsx';
import { LeadForm } from '../LeadForm.jsx';

export function FinalCTA() {
  return (
    <section className="eb-c-section eb-c-cta">
      <div className="eb-c-container eb-c-cta-grid">
        <div className="pp-reveal">
          <span className="eb-c-eyebrow">Get started</span>
          <h2 className="eb-c-h2">Ready to bring your ministry online?</h2>
          <p className="eb-c-lead">Start your free trial today and be one of the first churches on EB Connect. We’ll have you set up and receiving online giving in days.</p>
          <ul className="eb-c-price-list" style={{ borderTop: 'none', borderBottom: 'none', paddingTop: 14, marginBottom: 0 }}>
            <li><span className="eb-c-check"><Icon name="check" size={14} /></span> 14 days free, no credit card</li>
            <li><span className="eb-c-check"><Icon name="check" size={14} /></span> Everything included for $25/month after</li>
            <li><span className="eb-c-check"><Icon name="check" size={14} /></span> Cancel anytime</li>
          </ul>
        </div>
        <div className="pp-reveal">
          <LeadForm />
        </div>
      </div>
    </section>
  );
}
