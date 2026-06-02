import { useEffect, useRef, useState } from 'react';

// Animated number that eases from its previous value to the new one. Counts
// from 0 on first mount and re-animates whenever `value` changes (e.g. after a
// filter refetch). Honors prefers-reduced-motion by jumping straight to the
// final value. `format` maps the (interpolated) number to a display string.
export function CountUp({ value, format = (n) => String(Math.round(n)), duration = 750 }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const to = Number(value) || 0;
    const from = Number(fromRef.current) || 0;
    const reduce = typeof window !== 'undefined'
      && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || from === to) { setDisplay(to); fromRef.current = to; return undefined; }

    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(from + (to - from) * eased);
      if (t < 1) { rafRef.current = requestAnimationFrame(tick); }
      else { fromRef.current = to; }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <>{format(display)}</>;
}
