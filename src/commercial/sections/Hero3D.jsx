import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Icon } from '../Icon.jsx';
import { scrollToId } from '../../public/smoothScroll.js';

const Hero3DCanvas = lazy(() => import('./Hero3DCanvas.jsx'));

function detect3D() {
  if (typeof window === 'undefined') return false;
  if (!document.documentElement.classList.contains('pp-animate')) return false; // reduced-motion off
  if (window.innerWidth < 768) return false; // skip on phones (perf/battery)
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch { return false; }
}

export function Hero3D({ onStart }) {
  const [use3D] = useState(detect3D);
  const mobile = typeof window !== 'undefined' && window.innerWidth < 1100;
  const framesRef = useRef(null);

  // Scroll parallax for the floating product "hyperframe" cards (transform-only,
  // rAF-throttled, motion-gated). Cards drift upward as the hero scrolls away.
  useEffect(() => {
    if (!document.documentElement.classList.contains('pp-animate')) return undefined;
    const frames = framesRef.current ? Array.from(framesRef.current.children) : [];
    if (!frames.length) return undefined;
    let ticking = false;
    const update = () => {
      ticking = false;
      const y = window.scrollY;
      frames.forEach((f, i) => {
        const speed = 0.12 + i * 0.06;
        f.style.transform = `translate3d(0, ${-y * speed}px, 0)`;
      });
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <section className="eb-c-hero" id="top">
      <div className="eb-c-hero-canvas" aria-hidden="true">
        <Suspense fallback={null}>{use3D && <Hero3DCanvas mobile={mobile} />}</Suspense>
      </div>
      <div className="eb-c-hero-fade" aria-hidden="true" />

      {/* Floating "what it solves, in 3 steps" cards. Plain language, all true,
          no money/metrics — the simple path from scattered to sorted. */}
      <div className="eb-c-frames" ref={framesRef} aria-hidden="true">
        <div className="eb-c-frame eb-c-frame--a">
          <div className="eb-c-frame-title">Step 1</div>
          <div className="eb-c-frame-value">Bring your church online</div>
          <div className="eb-c-frame-row">Website, sermons &amp; events</div>
        </div>
        <div className="eb-c-frame eb-c-frame--c">
          <div className="eb-c-frame-title">Step 2</div>
          <div className="eb-c-frame-value">Run it from one place</div>
          <div className="eb-c-frame-row">Members, teams &amp; content</div>
        </div>
        <div className="eb-c-frame eb-c-frame--b">
          <div className="eb-c-frame-title">Step 3</div>
          <div className="eb-c-frame-value">Let the busywork run itself</div>
          <div className="eb-c-frame-row">Reports &amp; reminders, automatic</div>
        </div>
      </div>

      <div className="eb-c-container">
        <div className="eb-c-hero-inner pp-animate-hero">
          <h1>Your whole ministry,<br /><em>in one place.</em></h1>
          <p className="eb-c-hero-sub">
            Online giving, member management, tax receipts, and a beautiful church website, for just $25 a month.
          </p>
          <div className="eb-c-hero-actions">
            <button className="eb-c-btn eb-c-btn--primary eb-c-btn--lg" onClick={onStart}>
              Start your 14-day free trial <Icon name="arrowRight" size={18} />
            </button>
            <button className="eb-c-btn eb-c-btn--onlight-ghost eb-c-btn--lg" onClick={() => scrollToId('included')}>
              See everything included
            </button>
          </div>
          <div className="eb-c-hero-meta">
            <span className="eb-c-chip"><Icon name="check" size={15} /> $25/month · one plan</span>
            <span className="eb-c-chip"><Icon name="check" size={15} /> No setup fees</span>
            <span className="eb-c-chip"><Icon name="check" size={15} /> No charge for 14 days</span>
          </div>
        </div>
      </div>

      <div className="eb-c-hero-scroll" aria-hidden="true"><span /></div>
    </section>
  );
}
