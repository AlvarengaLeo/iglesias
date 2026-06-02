import { scrollToId } from '../public/smoothScroll.js';

export function Footer({ onStart }) {
  const year = 2026;
  return (
    <footer className="eb-c-footer">
      <div className="eb-c-container">
        <div className="eb-c-footer-top">
          <div>
            <a className="eb-c-brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <img className="eb-c-logo eb-c-logo--white" src="/logo-web.png" alt="EB Connect" />
            </a>
            <p className="eb-c-footer-tag">Everything your church needs, all in one place: giving, people, and a beautiful website.</p>
          </div>
          <div className="eb-c-footer-links">
            <div className="eb-c-footer-col">
              <h5>Product</h5>
              <button onClick={() => scrollToId('included')}>What's included</button>
              <button onClick={() => scrollToId('how')}>How it works</button>
              <button onClick={() => scrollToId('pricing')}>Pricing</button>
            </div>
            <div className="eb-c-footer-col">
              <h5>Get started</h5>
              <button onClick={onStart}>Start free trial</button>
              <a href="/index.html">Sign in</a>
            </div>
          </div>
        </div>
        <div className="eb-c-footer-bottom">
          <span>© {year} EB Connect. All rights reserved.</span>
          <span>One plan · $25/month · Cancel anytime</span>
        </div>
      </div>
    </footer>
  );
}
