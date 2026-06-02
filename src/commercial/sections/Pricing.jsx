import { Icon } from '../Icon.jsx';

const INCLUDED = [
  'One-time & recurring online giving',
  'Member & supporter CRM',
  'Funds, campaigns & live goals',
  'Automatic tax receipts & statements',
  'Real-time giving dashboards',
  'A complete church website',
  'Sermons, events, podcast & gallery',
  'Team roles & secure access',
];

export function Pricing({ onStart }) {
  return (
    <section className="eb-c-section eb-c-section--dark" id="pricing">
      <div className="eb-c-container">
        <div className="eb-c-pricing-head pp-reveal">
          <span className="eb-c-eyebrow">Simple, honest pricing</span>
          <h2 className="eb-c-h2">One plan. $25 a month.<br />Everything included.</h2>
          <p className="eb-c-lead">No tiers to compare, no features locked behind a higher price. Every church gets everything.</p>
        </div>

        <div className="eb-c-price-card pp-reveal">
          <span className="eb-c-price-badge">14-day free trial</span>
          <div className="eb-c-price-amount"><b>$25</b><span className="eb-c-per">/ month</span></div>
          <p className="eb-c-price-trial">No charge for 14 days · card required · cancel anytime.</p>

          <ul className="eb-c-price-list">
            {INCLUDED.map((f) => (
              <li key={f}><span className="eb-c-check"><Icon name="check" size={14} /></span>{f}</li>
            ))}
          </ul>

          <p className="eb-c-price-coffee">Less than a coffee a week to run your entire church online.</p>

          <button className="eb-c-btn eb-c-btn--primary eb-c-btn--lg eb-c-btn--block" onClick={onStart}>
            Start your free trial <Icon name="arrowRight" size={18} />
          </button>

          <div className="eb-c-price-trust">
            <span><Icon name="check" size={14} /> No setup fees</span>
            <span><Icon name="check" size={14} /> No per-feature charges</span>
            <span><Icon name="check" size={14} /> Cancel anytime</span>
          </div>
        </div>
      </div>
    </section>
  );
}
