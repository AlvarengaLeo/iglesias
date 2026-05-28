// Public-facing church portal. Standalone page, anonymous access via RLS.
// URL: /portal.html?slug=casa-de-restauracion

import { useEffect, useState } from 'react';
import { getPublicPortalBySlug } from '../api/portal.js';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const formatMoney = (cents) => '$' + (Number(cents) / 100).toLocaleString('en-US');

const initials = (name) => {
  if (!name) return '··';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
};

export function PublicPortal() {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    // Title from <title> tag, will update after fetch
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('slug') || 'casa-de-restauracion';

    getPublicPortalBySlug(slug)
      .then((data) => {
        if (!data) {
          setState({ loading: false, data: null, error: 'not_found' });
        } else if (!data.portal) {
          setState({ loading: false, data, error: 'not_published' });
        } else {
          setState({ loading: false, data, error: null });
          document.title = data.church.public_name;
        }
      })
      .catch((e) => setState({ loading: false, data: null, error: e.message }));
  }, []);

  if (state.loading) {
    return <div className="pp-loading"><div className="pp-spinner" /></div>;
  }

  if (state.error === 'not_found') {
    return <PublicError title="Iglesia no encontrada" message="La iglesia que buscas no existe o el enlace es incorrecto." />;
  }

  if (state.error === 'not_published') {
    return <PublicError title="Portal en preparación" message={`${state.data.church.public_name} está terminando su portal público. Vuelve pronto.`} />;
  }

  if (state.error) {
    return <PublicError title="Error" message={state.error} />;
  }

  const { church, portal, campaigns, serviceTimes } = state.data;
  const data = portal.published_data || {};
  const identity = data.identity || {};
  const hero = data.hero || {};
  const donations = data.donations || {};
  const contact = data.contact || {};
  const social = contact.social || {};
  const color = identity.primary_color || church.primary_color || '#8A6A4A';
  const publicName = identity.public_name || church.public_name;

  return (
    <div className="pp" style={{ '--pp-color': color }}>
      {/* Top brand bar */}
      <header className="pp-topbar">
        <div className="pp-container pp-topbar-inner">
          <a href="#" className="pp-brand">
            <span className="pp-logo">{initials(publicName)}</span>
            <span>{publicName}</span>
          </a>
          <nav className="pp-nav">
            <a href="#horarios">Horarios</a>
            {campaigns.length > 0 && <a href="#campanas">Campañas</a>}
            <a href="#contacto">Contacto</a>
            <a href="#donar" className="pp-nav-cta">{donations.button_text || 'Donar'}</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pp-hero">
        {hero.image_url && (
          <div className="pp-hero-bg" style={{ backgroundImage: `url(${hero.image_url})` }} aria-hidden />
        )}
        <div className="pp-container pp-hero-content">
          <div className="pp-hero-logo">{initials(publicName)}</div>
          <h1 className="pp-hero-title">{hero.title || publicName}</h1>
          {hero.message && <p className="pp-hero-message">{hero.message}</p>}
          <a href="#donar" className="pp-btn pp-btn-primary pp-hero-cta">
            {donations.button_text || hero.cta_text || 'Donar ahora'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
          </a>
        </div>
      </section>

      {/* Horarios */}
      {serviceTimes.length > 0 && (
        <section id="horarios" className="pp-section">
          <div className="pp-container">
            <h2 className="pp-section-title">Horarios de servicio</h2>
            <p className="pp-section-sub">Te esperamos cada semana.</p>
            <div className="pp-schedule">
              {serviceTimes.map((s) => (
                <div key={s.id} className="pp-schedule-card">
                  <div className="pp-schedule-day">{DAYS[s.day_of_week]}</div>
                  <div className="pp-schedule-time">{s.start_time?.slice(0, 5)}</div>
                  <div className="pp-schedule-type">{s.meeting_type}</div>
                  {s.location && <div className="pp-schedule-loc">{s.location}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Campañas */}
      {campaigns.length > 0 && (
        <section id="campanas" className="pp-section pp-section-alt">
          <div className="pp-container">
            <h2 className="pp-section-title">Campañas activas</h2>
            <p className="pp-section-sub">Apoya las metas de nuestra comunidad.</p>
            <div className="pp-campaigns">
              {campaigns.map((c) => (
                <article key={c.id} className="pp-campaign">
                  <div className="pp-campaign-body">
                    <h3 className="pp-campaign-name">{c.name}</h3>
                    {c.description && <p className="pp-campaign-desc">{c.description}</p>}
                    <div className="pp-campaign-goal">Meta · <strong>{formatMoney(c.goal_cents)}</strong></div>
                    {c.end_date && (
                      <div className="pp-campaign-deadline">Cierra: {new Date(c.end_date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    )}
                    <a href="#donar" className="pp-btn pp-btn-secondary">Apoyar esta campaña</a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Donar */}
      <section id="donar" className="pp-donate">
        <div className="pp-container pp-donate-inner">
          <h2 className="pp-section-title pp-section-title-light">Sé parte de la obra</h2>
          <p className="pp-donate-text">
            Tu generosidad sostiene el ministerio y permite que sigamos sirviendo a la comunidad.
          </p>
          <button className="pp-btn pp-btn-light" onClick={() => alert('Donaciones en línea: próximamente. Por ahora puedes contactarnos directamente.')}>
            {donations.button_text || 'Donar ahora'}
          </button>
          {church.ein && (
            <p className="pp-donate-tax">EIN <code>{church.ein}</code> · 501(c)(3) — tu donación es deducible de impuestos.</p>
          )}
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="pp-section">
        <div className="pp-container pp-contact-grid">
          <div>
            <h2 className="pp-section-title">Visítanos</h2>
            <p className="pp-section-sub">Estamos aquí para ti.</p>
            <ul className="pp-contact-list">
              {contact.address && (
                <li>
                  <Icon name="map" />
                  <span>{contact.address}</span>
                </li>
              )}
              {contact.phone && (
                <li>
                  <Icon name="phone" />
                  <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                </li>
              )}
              {contact.email && (
                <li>
                  <Icon name="mail" />
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </li>
              )}
            </ul>
            {(social.facebook || social.instagram || social.youtube || social.whatsapp) && (
              <div className="pp-social">
                {social.facebook && <a href={socialUrl('facebook', social.facebook)} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Icon name="facebook" /></a>}
                {social.instagram && <a href={socialUrl('instagram', social.instagram)} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Icon name="instagram" /></a>}
                {social.youtube && <a href={socialUrl('youtube', social.youtube)} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Icon name="youtube" /></a>}
                {social.whatsapp && <a href={`https://wa.me/${social.whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><Icon name="whatsapp" /></a>}
              </div>
            )}
          </div>
          {contact.map_url && (
            <div className="pp-map-card">
              <a href={contact.map_url} target="_blank" rel="noopener noreferrer" className="pp-btn pp-btn-secondary">
                <Icon name="map" /> Ver en Google Maps
              </a>
            </div>
          )}
        </div>
      </section>

      <footer className="pp-footer">
        <div className="pp-container pp-footer-inner">
          <span>© {new Date().getFullYear()} {publicName}. Todos los derechos reservados.</span>
          <span className="pp-powered">Powered by Sistema de Iglesia</span>
        </div>
      </footer>
    </div>
  );
}

function socialUrl(network, handle) {
  const clean = handle.replace(/^@/, '').trim();
  if (clean.startsWith('http')) return clean;
  switch (network) {
    case 'facebook': return `https://facebook.com/${clean}`;
    case 'instagram': return `https://instagram.com/${clean}`;
    case 'youtube':   return `https://youtube.com/${clean.startsWith('@') ? clean : '@' + clean}`;
    default: return '#';
  }
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

function Icon({ name, size = 18 }) {
  const paths = {
    map:      <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>,
    phone:    <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></>,
    mail:     <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
    alert:    <><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.86a2 2 0 0 1 3.4 0l8.6 14.36A2 2 0 0 1 20.6 21H3.4a2 2 0 0 1-1.7-2.78z"/></>,
    facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>,
    instagram:<><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.5" y2="6.5"/></>,
    youtube:  <><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></>,
    whatsapp: <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name] || null}
    </svg>
  );
}
