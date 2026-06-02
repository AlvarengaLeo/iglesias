import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { href } from './router.js';
import { initials } from './helpers.js';
import { lockScroll, unlockScroll } from './smoothScroll.js';

// Sticky top nav. Desktop: inline links + Give CTA. Mobile (<720px): hamburger
// opening a full-width drawer (focus-locked, Escape to close, body scroll lock).
export function Nav({ church, publicName, donateLabel, links, liveUrl = null, onDonate, overHero = false }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    lockScroll();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      unlockScroll();
    };
  }, [open]);

  // Over the hero: start transparent, turn frosted-solid once the user scrolls.
  useEffect(() => {
    if (!overHero) { setScrolled(false); return; }
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [overHero]);

  const topbarClass = [
    'pp-topbar',
    overHero ? 'pp-topbar--over' : '',
    overHero && (scrolled || open) ? 'pp-topbar--solid' : '',
  ].filter(Boolean).join(' ');

  const logo = church.logo_url
    ? <img src={church.logo_url} alt={publicName} />
    : initials(publicName);

  const donate = () => { setOpen(false); onDonate(); };

  return (
    <>
    <header className={topbarClass}>
      <div className="pp-container pp-topbar-inner">
        <a href={href('/')} className="pp-brand">
          <span className="pp-logo">{logo}</span>
          <span>{publicName}</span>
        </a>

        <nav className="pp-nav" aria-label="Primary">
          {links.map((l) => (
            <a key={l.path} href={href(l.path)}>{l.label}</a>
          ))}
          {liveUrl && (
            <a className="pp-nav-live" href={liveUrl} target="_blank" rel="noopener noreferrer">
              <span className="pp-live-dot" aria-hidden /> Watch Live
            </a>
          )}
          <button type="button" className="pp-nav-cta" onClick={onDonate}>{donateLabel}</button>
          <button
            type="button"
            className="pp-nav-toggle"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="pp-nav-drawer"
            onClick={() => setOpen(true)}
          >
            <Icon name="menu" size={22} />
          </button>
        </nav>
      </div>
    </header>

      {open && (
        <div className="pp-nav-drawer-overlay" onClick={() => setOpen(false)}>
          <div id="pp-nav-drawer" className="pp-nav-drawer" role="dialog" aria-modal="true" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
            <div className="pp-nav-drawer-head">
              <span className="pp-brand">
                <span className="pp-logo">{logo}</span>
                <span>{publicName}</span>
              </span>
              <button type="button" className="pp-nav-drawer-close" aria-label="Close menu" onClick={() => setOpen(false)}>
                <Icon name="close" size={22} />
              </button>
            </div>
            <nav className="pp-nav-drawer-links" aria-label="Mobile">
              {links.map((l) => (
                <a key={l.path} href={href(l.path)} onClick={() => setOpen(false)}>{l.label}</a>
              ))}
              {liveUrl && (
                <a href={liveUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                  <span className="pp-live-dot" aria-hidden /> Watch Live
                </a>
              )}
              <button type="button" className="pp-btn pp-btn-primary" onClick={donate}>{donateLabel}</button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
