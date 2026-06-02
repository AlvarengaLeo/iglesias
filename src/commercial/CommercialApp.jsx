import { useEffect, useState, useCallback } from 'react';
import { initSmoothScroll, destroySmoothScroll } from '../public/smoothScroll.js';
import { Nav } from './Nav.jsx';
import { Footer } from './Footer.jsx';
import { Hero3D } from './sections/Hero3D.jsx';
import { ProblemSolution } from './sections/ProblemSolution.jsx';
import { WhatsIncluded } from './sections/WhatsIncluded.jsx';
import { HowItWorks } from './sections/HowItWorks.jsx';
import { Pricing } from './sections/Pricing.jsx';
import { CheckoutModal } from './checkout/CheckoutModal.jsx';

export function CommercialApp() {
  // Open the checkout automatically when returning from a 3DS redirect.
  const [checkoutOpen, setCheckoutOpen] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('redirect_status') === 'succeeded',
  );
  const openCheckout = useCallback(() => setCheckoutOpen(true), []);

  // Premium inertial smooth scroll (desktop + motion-allowed; degrades natively).
  useEffect(() => { initSmoothScroll(); return () => destroySmoothScroll(); }, []);

  // Stripe injects a floating "developer tools" iframe in TEST mode with an
  // inline `display:block !important` that it re-applies on style mutations, so
  // CSS can't hide it. Force it hidden and re-hide whenever Stripe re-shows it.
  // (In live mode the iframe is never created, so this is a no-op there.)
  useEffect(() => {
    const kill = (f) => { if (f.style.display !== 'none') f.style.setProperty('display', 'none', 'important'); };
    const scan = () => document.querySelectorAll('iframe[title="Stripe developer tools frame"]').forEach((f) => {
      kill(f);
      if (!f.dataset.ebHidden) {
        f.dataset.ebHidden = '1';
        new MutationObserver(() => kill(f)).observe(f, { attributes: true, attributeFilter: ['style'] });
      }
    });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  // Cinematic scroll reveal — fade/slide elements in as they enter the viewport.
  useEffect(() => {
    if (!document.documentElement.classList.contains('pp-animate')) return undefined;
    const targets = document.querySelectorAll('.pp-reveal:not(.is-visible), .pp-reveal-stagger:not(.is-visible)');
    if (!targets.length) return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  // Thin top scroll-progress bar (transform-cheap width update, rAF-throttled).
  useEffect(() => {
    const bar = document.querySelector('.eb-c-progress span');
    if (!bar) return undefined;
    let ticking = false;
    const update = () => {
      ticking = false;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="eb-c">
      <div className="eb-c-progress" aria-hidden="true"><span /></div>
      <Nav onStart={openCheckout} />
      <main>
        <Hero3D onStart={openCheckout} />
        <ProblemSolution />
        <WhatsIncluded onStart={openCheckout} />
        <HowItWorks />
        <Pricing onStart={openCheckout} />
      </main>
      <Footer onStart={openCheckout} />
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </div>
  );
}
