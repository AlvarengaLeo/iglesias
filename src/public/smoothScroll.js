// Premium inertial smooth scroll (Lenis) — singleton.
//
// Gated: only runs on desktop pointers AND when motion is allowed (the root has
// `.pp-animate`, set in main.jsx only when the user does NOT prefer reduced
// motion). On touch / reduced-motion the native scroll is kept untouched and
// every helper degrades gracefully.

import Lenis from 'lenis';

let lenis = null;
let rafId = 0;

export function initSmoothScroll() {
  if (lenis || typeof window === 'undefined') return lenis;
  if (!document.documentElement.classList.contains('pp-animate')) return null;
  if (!window.matchMedia('(pointer: fine)').matches) return null; // desktop only

  lenis = new Lenis({
    duration: 1.1,
    easing: (t) => 1 - Math.pow(1 - t, 3), // easeOutCubic
    smoothWheel: true,
    syncTouch: false, // leave touch scrolling native
  });

  const raf = (time) => {
    if (!lenis) return;
    lenis.raf(time);
    rafId = requestAnimationFrame(raf);
  };
  rafId = requestAnimationFrame(raf);
  return lenis;
}

export function destroySmoothScroll() {
  if (!lenis) return;
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  lenis.destroy();
  lenis = null;
}

// Pause/resume smooth scroll (used while a modal/drawer locks the page).
export function lockScroll() { if (lenis) lenis.stop(); }
export function unlockScroll() { if (lenis) lenis.start(); }

// Eased scroll to an in-page anchor (clears the ~64px fixed nav).
export function scrollToId(id) {
  const clean = String(id).replace(/^#/, '');
  if (lenis) { lenis.scrollTo(`#${clean}`, { offset: -64, duration: 1.0 }); return; }
  document.getElementById(clean)?.scrollIntoView({ behavior: 'smooth' });
}

// Reset to top (instant on route change so Lenis doesn't animate the jump).
export function scrollToTop(immediate = false) {
  if (lenis) { lenis.scrollTo(0, { immediate }); return; }
  window.scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
}
