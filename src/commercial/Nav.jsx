import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { scrollToId } from '../public/smoothScroll.js';

const LINKS = [
  { id: 'why', label: 'Why EB Connect' },
  { id: 'included', label: "What's included" },
  { id: 'how', label: 'How it works' },
  { id: 'pricing', label: 'Pricing' },
];

export function Nav({ onStart }) {
  const [scrolled, setScrolled] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { document.body.style.overflow = drawer ? 'hidden' : ''; }, [drawer]);

  const go = (id) => { setDrawer(false); scrollToId(id); };

  return (
    <>
      <header className={`eb-c-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="eb-c-container eb-c-nav-inner">
          <a className="eb-c-brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <img className="eb-c-logo" src="/logo-web.png" alt="EB Connect" />
          </a>
          <nav className="eb-c-nav-links" aria-label="Primary">
            {LINKS.map((l) => (
              <button key={l.id} className="eb-c-nav-link" onClick={() => go(l.id)}>{l.label}</button>
            ))}
          </nav>
          <div className="eb-c-nav-cta">
            <a className="eb-c-btn eb-c-btn--ghost" href="/index.html">Sign in</a>
            <button className="eb-c-btn eb-c-btn--primary" onClick={onStart}>Start free trial</button>
            <button className="eb-c-nav-toggle" aria-label="Open menu" onClick={() => setDrawer(true)}><Icon name="menu" size={24} /></button>
          </div>
        </div>
      </header>

      <div className={`eb-c-drawer ${drawer ? 'is-open' : ''}`} aria-hidden={!drawer}>
        <div className="eb-c-drawer-scrim" onClick={() => setDrawer(false)} />
        <div className="eb-c-drawer-panel">
          <div className="eb-c-drawer-head">
            <img className="eb-c-logo" src="/logo-web.png" alt="EB Connect" style={{ height: '26px' }} />
            <button className="eb-c-icon-btn" aria-label="Close menu" onClick={() => setDrawer(false)}><Icon name="close" size={24} /></button>
          </div>
          {LINKS.map((l) => (
            <button key={l.id} className="eb-c-drawer-link" onClick={() => go(l.id)}>{l.label}</button>
          ))}
          <a className="eb-c-drawer-link" href="/index.html">Sign in</a>
          <button className="eb-c-btn eb-c-btn--primary eb-c-btn--block" onClick={() => { setDrawer(false); onStart(); }}>Start free trial</button>
        </div>
      </div>
    </>
  );
}
