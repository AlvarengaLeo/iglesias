// Public-facing church portal — app shell + hash router.
// URL: /portal.html?slug=casa-de-restauracion#/sermons
//
// Owns: slug read, portal data fetch, the shared DonationModal, the persistent
// Nav + Footer, and route → page switching. Pages that need extra data (sermon
// archives, etc.) fetch it themselves via src/api/portalContent.js.

import { useEffect, useState, useCallback, useMemo } from 'react';
import { getPublicPortalBySlug } from '../api/portal.js';
import { initSmoothScroll, destroySmoothScroll, scrollToTop } from './smoothScroll.js';
import { formatMoney } from './helpers.js';
import { DonationModal } from './DonationModal.jsx';
import { Nav } from './Nav.jsx';
import { Footer } from './Footer.jsx';
import { Icon } from './Icon.jsx';
import { useRoute } from './router.js';
import { HomePage } from './HomePage.jsx';
import { SermonsPage } from './SermonsPage.jsx';
import { SermonDetailPage } from './SermonDetailPage.jsx';
import { PodcastPage } from './PodcastPage.jsx';
import { EventsPage } from './EventsPage.jsx';
import { MinistriesPage } from './MinistriesPage.jsx';
import { AboutPage } from './AboutPage.jsx';
import { GalleryPage } from './GalleryPage.jsx';

function getSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get('slug') || 'casa-de-restauracion';
}

// Set the browser-tab icon to the church's own favicon (uploaded from the CRM).
function applyFavicon(url) {
  if (typeof document === 'undefined' || !url) return;
  let link = document.querySelector("link[rel~='icon']");
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
  link.href = url;
}

export function PortalApp() {
  const [slug] = useState(getSlug);
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [donationModal, setDonationModal] = useState({ open: false, campaignId: null, fundId: null, initialView: 'form', initialResult: null });
  const route = useRoute();
  const isPreview = useMemo(() => new URLSearchParams(window.location.search).get('preview') === '1', []);

  // Accepts: nothing | a campaignId string | { campaignId, fundId }.
  // (Ignores DOM events passed by onClick handlers.)
  const openDonation = useCallback((arg = null) => {
    let campaignId = null, fundId = null;
    if (typeof arg === 'string') campaignId = arg;
    else if (arg && (arg.campaignId || arg.fundId)) { campaignId = arg.campaignId || null; fundId = arg.fundId || null; }
    setDonationModal({ open: true, campaignId, fundId, initialView: 'form', initialResult: null });
  }, []);
  const closeDonation = useCallback(() => setDonationModal({ open: false, campaignId: null, fundId: null, initialView: 'form', initialResult: null }), []);

  // Recover from a redirect-based payment authentication (some 3DS cards /
  // wallets): Stripe returns the donor to return_url with ?redirect_status=….
  // The donation is recorded by the webhook; here we just show the outcome so
  // the donor isn't left on a blank page after the full-page redirect.
  useEffect(() => {
    if (isPreview) return;
    const params = new URLSearchParams(window.location.search);
    const status = params.get('redirect_status');
    if (!status) return;
    const url = new URL(window.location.href);
    ['payment_intent', 'payment_intent_client_secret', 'redirect_status', 'source_type'].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    if (status === 'succeeded' || status === 'pending') {
      setDonationModal({ open: true, campaignId: null, fundId: null, initialView: 'thanks', initialResult: { paid: true } });
    }
  }, [isPreview]);

  useEffect(() => {
    // Preview mode (?preview=1): the admin embeds this page in an iframe and
    // streams the live draft over postMessage instead of fetching the RPC, so
    // the editor's preview renders exactly like the public site and updates as
    // you type. No network/auth needed inside the frame.
    if (isPreview) {
      const onMsg = (e) => {
        if (e.origin !== window.location.origin) return;
        if (!e.data) return;
        if (e.data.source === 'portal-admin-preview' && e.data.data) {
          setState({ loading: false, data: e.data.data, error: null });
        }
        // The editor asks us to reveal the section the user is editing: scroll it
        // into view and flash a highlight so they see exactly what they're changing.
        if (e.data.source === 'portal-admin-scroll' && e.data.section) {
          const reveal = () => {
            const el = document.getElementById(e.data.section);
            if (!el) return false;
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            el.classList.remove('pp-flash');
            void el.offsetWidth; // restart the animation if already applied
            el.classList.add('pp-flash');
            window.setTimeout(() => el.classList.remove('pp-flash'), 1700);
            return true;
          };
          // Retry briefly in case the draft that adds the section just streamed in.
          if (!reveal()) window.setTimeout(reveal, 120);
        }
      };
      window.addEventListener('message', onMsg);
      try { window.parent && window.parent.postMessage({ source: 'portal-preview-ready' }, window.location.origin); } catch (_) {}
      return () => window.removeEventListener('message', onMsg);
    }
    getPublicPortalBySlug(slug)
      .then((data) => {
        if (!data) setState({ loading: false, data: null, error: 'not_found' });
        else if (!data.portal) setState({ loading: false, data, error: 'not_published' });
        else {
          setState({ loading: false, data, error: null });
          document.title = data.church.public_name;
          // Favicon: the church's uploaded favicon, falling back to their logo.
          applyFavicon(data.church.favicon_url || data.church.logo_url);
        }
      })
      .catch((e) => setState({ loading: false, data: null, error: e.message }));
  }, [slug, isPreview]);

  // Premium inertial smooth scroll (Lenis). Skipped in the embedded preview
  // iframe and on touch / reduced-motion (handled inside the module).
  useEffect(() => {
    if (isPreview) return undefined;
    initSmoothScroll();
    return () => destroySmoothScroll();
  }, [isPreview]);

  // On route change: scroll to top (instant so Lenis doesn't animate the jump).
  useEffect(() => {
    scrollToTop(true);
  }, [route.name, route.param]);

  // Cinematic scroll reveal: fade/slide elements in as they enter the viewport.
  // Only runs when motion is allowed (root has .pp-animate, set in main.jsx).
  // Re-scans after each route/data change so new pages animate too.
  useEffect(() => {
    if (!document.documentElement.classList.contains('pp-animate')) return;
    const targets = document.querySelectorAll('.pp-reveal:not(.is-visible), .pp-reveal-stagger:not(.is-visible)');
    if (!targets.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, [route.name, route.param, state.data]);

  // Cinematic scroll: thin top progress bar + hero parallax (background drifts
  // slower than the page for depth). rAF-throttled, transform-only (GPU), and
  // disabled under reduced motion. Re-binds per route to re-find the hero.
  useEffect(() => {
    if (!document.documentElement.classList.contains('pp-animate')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bar = document.querySelector('.pp-scroll-progress span');
    const heroMedia = document.querySelector('.pp-hero-media');
    const heroInner = document.querySelector('.pp-hero-inner');
    const tiles = Array.from(document.querySelectorAll('.pp-collage img'));
    let ticking = false;
    const update = () => {
      ticking = false;
      const top = window.scrollY || 0;
      const vh = window.innerHeight || 1;
      const docH = document.documentElement.scrollHeight - vh;
      const p = docH > 0 ? Math.min(1, top / docH) : 0;
      if (bar) bar.style.transform = `scaleX(${p})`;
      // Hero: photo drifts slow, content drifts slower + fades out (hand-off).
      if (heroMedia) {
        const hero = heroMedia.parentElement;
        const h = hero ? hero.offsetHeight : 0;
        if (top < h + 120) {
          const prog = h > 0 ? Math.min(1, top / h) : 0;
          heroMedia.style.transform = `translate3d(0, ${Math.min(top, h) * 0.18}px, 0)`;
          if (heroInner) {
            heroInner.style.transform = `translate3d(0, ${Math.min(top, h) * 0.06}px, 0)`;
            heroInner.style.opacity = String(Math.max(0, 1 - prog * 1.15));
          }
        }
      }
      // Collage: each photo drifts inside its frame at a slightly different
      // speed (lead 2×2 slowest) for layered depth.
      if (tiles.length) {
        for (let i = 0; i < tiles.length; i++) {
          const img = tiles[i];
          const r = img.parentElement.getBoundingClientRect();
          const center = (r.top + r.height / 2 - vh / 2) / vh;
          const speed = i === 0 ? 12 : 20 + (i % 3) * 5;
          img.style.transform = `translate3d(0, ${(-center * speed).toFixed(1)}px, 0)`;
        }
      }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [route.name, route.param, state.data]);

  // Subtle 3D tilt on the featured sermon thumbnail (one premium "wow" moment).
  // Desktop pointers only, motion allowed.
  useEffect(() => {
    if (!document.documentElement.classList.contains('pp-animate')) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const el = document.querySelector('.pp-sermon-feature-media');
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg)`;
    };
    const onLeave = () => { el.style.transform = ''; };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [route.name, route.param, state.data]);

  // Campaigns: count the raised amount up from $0 when it scrolls into view
  // (pairs with the CSS bar-fill). Skipped under reduced motion (shows final).
  useEffect(() => {
    if (!document.documentElement.classList.contains('pp-animate')) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const nodes = Array.from(document.querySelectorAll('strong[data-countup]'));
    if (!nodes.length) return;
    nodes.forEach((n) => { n.textContent = formatMoney(0); delete n.dataset.done; });
    const animate = (node) => {
      const target = Number(node.dataset.countup) || 0;
      const dur = 1100;
      let start = null;
      const step = (ts) => {
        if (start === null) start = ts;
        const t = Math.min(1, (ts - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        node.textContent = formatMoney(Math.round(target * eased));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !entry.target.dataset.done) {
          entry.target.dataset.done = '1';
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [route.name, route.param, state.data]);

  if (state.loading) {
    return <div className="pp-loading"><div className="pp-spinner" /></div>;
  }
  if (state.error === 'not_found') {
    return <PublicError title="Church not found" message="The church you're looking for doesn't exist or the link is incorrect." />;
  }
  if (state.error === 'not_published') {
    return <PublicError title="Portal coming soon" message={`${state.data.church.public_name} is finishing their public portal. Please check back soon.`} />;
  }
  if (state.error) {
    return <PublicError title="Error" message={state.error} />;
  }

  const { church, portal, campaigns, serviceTimes, latestSermons, upcomingEvents, featuredProjects, latestPodcast } = state.data;
  const published = portal.published_data || {};
  const identity = published.identity || {};
  const donations = published.donations || {};
  const contact = published.contact || {};
  const social = contact.social || {};
  const media = published.media || {};
  const about = published.about || {};
  const beliefs = published.beliefs || {};
  const color = identity.primary_color || church.primary_color || '#8A6A4A';
  const publicName = identity.public_name || church.public_name;
  const donateLabel = donations.button_text || 'Give';

  const hasAbout = !!(about.story || about.mission || about.vision || (Array.isArray(beliefs.items) && beliefs.items.length));
  const hasGallery = Array.isArray(media.gallery) && media.gallery.length > 0;
  const liveUrl = media.live_url || null;

  // Nav/Footer links: only show a section when there's something to see.
  // Home siempre va primero y lleva a la portada ('/').
  const links = [];
  links.push({ label: 'Home', path: '/' });
  if (hasAbout) links.push({ label: 'About', path: '/about' });
  if (latestSermons.length) links.push({ label: 'Sermons', path: '/sermons' });
  if (upcomingEvents.length) links.push({ label: 'Events', path: '/events' });
  if (featuredProjects.length) links.push({ label: 'Ministries', path: '/ministries' });
  if (latestPodcast.length) links.push({ label: 'Podcast', path: '/podcast' });
  if (hasGallery) links.push({ label: 'Gallery', path: '/gallery' });

  const isHome = !route.name || route.name === 'home';

  let page;
  switch (route.name) {
    case 'about':      page = <AboutPage published={published} publicName={publicName} />; break;
    case 'sermons':    page = <SermonsPage slug={slug} />; break;
    case 'sermon':     page = <SermonDetailPage key={route.param} slug={slug} id={route.param} />; break;
    case 'podcast':    page = <PodcastPage slug={slug} />; break;
    case 'events':     page = <EventsPage slug={slug} />; break;
    case 'ministries': page = <MinistriesPage slug={slug} onDonate={openDonation} />; break;
    case 'gallery':    page = <GalleryPage published={published} />; break;
    default:           page = <HomePage data={state.data} onDonate={openDonation} liveUrl={liveUrl} />;
  }

  return (
    <div className="pp" style={{ '--pp-color': color }}>
      <div className="pp-scroll-progress" aria-hidden="true"><span /></div>
      <Nav church={church} publicName={publicName} donateLabel={donateLabel} links={links} liveUrl={liveUrl} onDonate={() => openDonation()} overHero={isHome} />
      {page}
      <Footer
        publicName={publicName}
        mission={published.hero?.message}
        serviceTimes={serviceTimes}
        contact={contact}
        social={social}
        links={links}
      />
      <DonationModal
        open={donationModal.open}
        onClose={closeDonation}
        portalData={state.data}
        preselectedCampaignId={donationModal.campaignId}
        preselectedFundId={donationModal.fundId}
        initialView={donationModal.initialView}
        initialResult={donationModal.initialResult}
      />
    </div>
  );
}

function PublicError({ title, message }) {
  return (
    <div className="pp-error-shell">
      <div className="pp-error-card">
        <div className="pp-error-icon"><Icon name="alert" /></div>
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </div>
  );
}
