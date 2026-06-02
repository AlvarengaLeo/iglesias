const STEPS = [
  { n: '1', title: 'Tell us about your church', body: "Share a few details and we'll create your account. Free for 14 days, cancel anytime.", pct: 33 },
  { n: '2', title: 'We set up your site & funds', body: 'Your website, default funds, and receipt settings come ready. Just add your logo and content.', pct: 66 },
  { n: '3', title: 'Start receiving online giving', body: 'Publish your portal, accept online giving, and watch it land in your dashboard.', pct: 100 },
];

export function HowItWorks() {
  return (
    <section className="eb-c-section eb-c-section--alt" id="how">
      <div className="eb-c-container">
        <div className="pp-reveal" style={{ maxWidth: 640 }}>
          <span className="eb-c-eyebrow">Live in days, not months</span>
          <h2 className="eb-c-h2">Three steps to launch.</h2>
          <p className="eb-c-lead">We do the heavy lifting at setup so your church is ready to receive online giving fast.</p>
        </div>
        <div className="eb-c-steps pp-reveal-stagger">
          {STEPS.map((s) => (
            <div className="eb-c-step" key={s.n}>
              <div className="eb-c-step-n">{s.n}</div>
              <h4>{s.title}</h4>
              <p>{s.body}</p>
              <div className="eb-c-step-track"><span style={{ width: `${s.pct}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
