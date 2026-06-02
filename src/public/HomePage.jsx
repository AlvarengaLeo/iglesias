import { Fragment } from 'react';
import { Icon } from './Icon.jsx';
import { href } from './router.js';
import { SectionHeader, EventCard, MinistryCard } from './cards.jsx';
import { MediaEmbed, posterFor } from './MediaEmbed.jsx';
import { DAYS, formatMoney, formatClock, formatDate } from './helpers.js';
import { mergeHomeCopy } from '../lib/homeCopyDefaults.js';
import { scrollToId } from './smoothScroll.js';

// Splits a heading into per-word spans for a cascading line/word reveal. Each
// word rises from behind a clip; staggered via the `--i` index in CSS. Spaces
// stay as breakable text nodes so the title still wraps naturally.
function SplitWords({ text }) {
  const words = String(text).trim().split(/\s+/);
  return words.map((w, i) => (
    <Fragment key={i}>
      <span className="pp-word"><span className="pp-word-in" style={{ '--i': i }}>{w}</span></span>
      {i < words.length - 1 ? ' ' : ''}
    </Fragment>
  ));
}

// Fallback hero photo so the hero never renders as a flat color band when the
// church hasn't uploaded one yet (matches the Claude Design mockup).
const DEFAULT_HERO = 'https://images.unsplash.com/photo-1438032005730-c779502df39b?q=80&w=2000&auto=format&fit=crop';

export function HomePage({ data, onDonate, liveUrl = null }) {
  const { church, portal, campaigns, serviceTimes, latestSermons, upcomingEvents, featuredProjects, latestPodcast } = data;
  const published = portal.published_data || {};
  const identity = published.identity || {};
  const hero = published.hero || {};
  const donations = published.donations || {};
  const contact = published.contact || {};
  const about = published.about || {};
  const media = published.media || {};
  const gallery = Array.isArray(media.gallery) ? media.gallery : [];
  const copy = mergeHomeCopy(published.home);
  const publicName = identity.public_name || church.public_name;
  const donateLabel = donations.button_text || 'Give';

  const heroImage = hero.image_url || DEFAULT_HERO;
  const heroSub = hero.message
    || "However far you've come, however you arrive — there's a seat for you here. Come as you are and find a family in the heart of Miami.";

  const welcomeTitle = about.headline || 'Welcome to our church family';
  const welcomeLead = (about.story ? about.story.split('\n').map((p) => p.trim()).filter(Boolean)[0] : about.mission)
    || "We're a Spirit-filled, multi-generational community — and you're already counted in.";

  const featuredSermon = latestSermons[0] || null;
  const sideSermons = latestSermons.slice(1, 3);

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    scrollToId(id);
  };

  const ClockIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="18" height="18"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
  );

  return (
    <>
      {/* ===== Hero ===== */}
      <section className="pp-hero" id="pp-hero" aria-label="Welcome">
        <div className="pp-hero-media" aria-hidden="true">
          <div className="pp-hero-bg" style={{ backgroundImage: `url(${heroImage})` }} />
        </div>
        <div className="pp-hero-scrim" aria-hidden="true" />
        <div className="pp-container">
          <div className="pp-hero-inner">
            <h1 className="pp-hero-title">
              {hero.title ? <SplitWords text={hero.title} /> : <>A house of faith, <em>restoration</em> &amp; community</>}
            </h1>
            <p className="pp-hero-sub">{heroSub}</p>
            <div className="pp-hero-actions">
              <a className="pp-btn pp-hero-cta" href="#pp-plan" onClick={scrollTo('pp-plan')}>
                Plan a Visit <Icon name="arrow" size={16} />
              </a>
              {latestSermons.length > 0 && (
                <a className="pp-btn pp-hero-cta-ghost" href={href('/sermons')}>
                  <Icon name="play" size={16} /> Watch a Message
                </a>
              )}
            </div>
            {serviceTimes.length > 0 && (
              <p className="pp-hero-times">
                {ClockIcon}
                {serviceTimes.slice(0, 3).map((s, i) => (
                  <span key={s.id} style={{ display: 'inline-flex', gap: 11, alignItems: 'center' }}>
                    {i > 0 && <span className="pp-dot-sep" aria-hidden="true">·</span>}
                    <span><b>{DAYS[s.day_of_week]?.slice(0, 3)}</b> {formatClock(s.start_time?.slice(0, 5))}</span>
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>
        <a className="pp-scroll-cue" href="#pp-welcome" onClick={scrollTo('pp-welcome')} aria-label="Scroll to learn more">
          Scroll
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6" /></svg>
        </a>
      </section>

      {/* ===== Watch Live banner ===== */}
      {liveUrl && (
        <a className="pp-live-banner" href={liveUrl} target="_blank" rel="noopener noreferrer">
          <span className="pp-live-dot" aria-hidden /> We're live now — <strong>Watch the service</strong>
          <Icon name="arrow" size={16} />
        </a>
      )}

      {/* ===== Welcome band ===== */}
      <section className="pp-welcome" id="pp-welcome">
        <div className="pp-container pp-welcome-inner pp-reveal">
          <span className="pp-eyebrow">{copy.welcome.eyebrow}</span>
          <h2 className="pp-welcome-title">{welcomeTitle}</h2>
          <p className="pp-welcome-lead">{welcomeLead}</p>
          <a className="pp-text-link" href={href('/about')}>
            Our story <Icon name="arrow" size={16} />
          </a>
        </div>
      </section>

      {/* ===== Life Together — community collage ===== */}
      {gallery.length >= 3 && (
        <section className="pp-section" id="pp-life">
          <div className="pp-container">
            <div className="pp-section-head-row pp-reveal">
              <SectionHeader eyebrow={copy.life.eyebrow} title={copy.life.title} align="left" />
              <p className="pp-sec-lead">{copy.life.lead}</p>
            </div>
            <div className="pp-collage pp-reveal-stagger">
              {gallery.slice(0, 5).map((g, i) => (
                <figure className={`pp-tile${i === 0 ? ' pp-tile-big' : ''}`} key={g.url || i}>
                  <img src={g.url} alt={g.caption || ''} loading="lazy" />
                  {g.caption && <figcaption className="pp-tile-cap">{g.caption}</figcaption>}
                </figure>
              ))}
            </div>
            <div style={{ marginTop: 34 }}>
              <a className="pp-text-link" href={href('/gallery')}>View gallery <Icon name="arrow" size={16} /></a>
            </div>
          </div>
        </section>
      )}

      {/* ===== Plan Your Visit ===== */}
      <section className="pp-section pp-plan" id="pp-plan">
        <div className="pp-container">
          <div className="pp-section-head-row pp-reveal">
            <SectionHeader eyebrow={copy.plan.eyebrow} title={copy.plan.title} align="left" />
            <p className="pp-sec-lead">{copy.plan.lead}</p>
          </div>
          <div className="pp-card-grid pp-grid-3 pp-reveal-stagger">
            <article className="pp-card pp-info-card">
              <span className="pp-info-icon" aria-hidden="true"><Icon name="clock" size={24} /></span>
              <h3 className="pp-card-title">{copy.plan.when_title}</h3>
              {serviceTimes.length > 0 ? (
                <ul className="pp-timetable">
                  {serviceTimes.slice(0, 4).map((s) => (
                    <li key={s.id}>
                      <b>{DAYS[s.day_of_week]}</b>
                      <span>{formatClock(s.start_time?.slice(0, 5))}{s.meeting_type ? ` · ${s.meeting_type}` : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="pp-card-desc">Join us this week for worship.</p>
              )}
            </article>

            <article className="pp-card pp-info-card">
              <span className="pp-info-icon" aria-hidden="true"><Icon name="map" size={24} /></span>
              <h3 className="pp-card-title">{copy.plan.where_title}</h3>
              <p className="pp-card-desc">{contact.address || 'Reach out and we will help you find us.'} {copy.plan.where_note}</p>
              {contact.map_url && (
                <a className="pp-text-link" href={contact.map_url} target="_blank" rel="noopener noreferrer">
                  Get directions <Icon name="arrow" size={16} />
                </a>
              )}
            </article>

            <article className="pp-card pp-info-card">
              <span className="pp-info-icon" aria-hidden="true"><Icon name="book" size={24} /></span>
              <h3 className="pp-card-title">{copy.plan.expect_title}</h3>
              <p className="pp-card-desc">{copy.plan.expect_body}</p>
            </article>
          </div>
        </div>
      </section>

      {/* ===== Latest message (featured) ===== */}
      {featuredSermon && (
        <section className="pp-section" id="pp-message">
          <div className="pp-container">
            <div className="pp-section-head-row pp-reveal">
              <SectionHeader eyebrow={copy.message.eyebrow} title={copy.message.title} align="left" />
              <p className="pp-sec-lead">{copy.message.lead}</p>
            </div>
            <div className="pp-sermon-split pp-reveal">
              <article className="pp-sermon-feature">
                <a className="pp-sermon-feature-media" href={href(`/sermon/${featuredSermon.id}`)} aria-label={`Watch: ${featuredSermon.title}`}>
                  {posterFor(featuredSermon)
                    ? <img src={posterFor(featuredSermon)} alt="" loading="lazy" />
                    : <div className="pp-thumb-empty"><Icon name="play" size={40} /></div>}
                  <span className="pp-play" aria-hidden="true"><span className="pp-play-btn"><Icon name="play" size={30} /></span></span>
                </a>
                <div className="pp-sermon-meta">
                  <span className="pp-tag">{featuredSermon.series || 'New'}</span>
                  {featuredSermon.speaker && <span>{featuredSermon.speaker}</span>}
                  <span className="pp-dot-sep" aria-hidden="true">·</span>
                  <span>{formatDate(featuredSermon.sermon_date)}</span>
                  {featuredSermon.scripture_reference && (
                    <><span className="pp-dot-sep" aria-hidden="true">·</span><span>{featuredSermon.scripture_reference}</span></>
                  )}
                </div>
                <h3 className="pp-sermon-feature-title">{featuredSermon.title}</h3>
                {featuredSermon.description && <p className="pp-sermon-feature-by">{featuredSermon.description}</p>}
                <a className="pp-btn pp-btn-primary" href={href(`/sermon/${featuredSermon.id}`)}>
                  <Icon name="play" size={16} /> Watch Message
                </a>
              </article>

              <div className="pp-sermon-side">
                {sideSermons.map((s) => (
                  <a className="pp-sermon-mini" href={href(`/sermon/${s.id}`)} key={s.id}>
                    <div className="pp-sermon-mini-thumb">
                      {posterFor(s)
                        ? <img src={posterFor(s)} alt="" loading="lazy" />
                        : <div className="pp-thumb-empty"><Icon name="play" size={22} /></div>}
                      <span className="pp-sermon-mini-play" aria-hidden="true"><Icon name="play" size={26} /></span>
                    </div>
                    <div className="pp-sermon-mini-info">
                      <h4>{s.title}</h4>
                      <p>{[s.speaker, formatDate(s.sermon_date, { month: 'short', day: 'numeric' })].filter(Boolean).join(' · ')}</p>
                    </div>
                  </a>
                ))}
                <a className="pp-text-link" href={href('/sermons')}>All sermons <Icon name="arrow" size={16} /></a>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== Upcoming events ===== */}
      {upcomingEvents.length > 0 && (
        <section className="pp-section pp-section-alt" id="pp-events">
          <div className="pp-container">
            <div className="pp-section-head-row">
              <SectionHeader eyebrow={copy.events.eyebrow} title={copy.events.title} align="left" />
              <a className="pp-link-arrow" href={href('/events')}>All events <Icon name="arrow" size={14} /></a>
            </div>
            <div className="pp-card-grid pp-grid-3 pp-reveal-stagger">
              {upcomingEvents.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          </div>
        </section>
      )}

      {/* ===== Featured ministries ===== */}
      {featuredProjects.length > 0 && (
        <section className="pp-section" id="pp-ministries">
          <div className="pp-container">
            <div className="pp-section-head-row">
              <SectionHeader eyebrow={copy.ministries.eyebrow} title={copy.ministries.title} align="left" />
              <a className="pp-link-arrow" href={href('/ministries')}>See all <Icon name="arrow" size={14} /></a>
            </div>
            <div className="pp-card-grid pp-grid-3 pp-reveal-stagger">
              {featuredProjects.map((p) => <MinistryCard key={p.id} project={p} onDonate={onDonate} />)}
            </div>
          </div>
        </section>
      )}

      {/* ===== Campaigns ===== */}
      {campaigns.length > 0 && (
        <section className="pp-section pp-section-alt" id="pp-campaigns">
          <div className="pp-container">
            <SectionHeader eyebrow={copy.campaigns.eyebrow} title={copy.campaigns.title} sub={copy.campaigns.sub} />
            <div className="pp-campaigns pp-reveal-stagger">
              {campaigns.map((c) => (
                <article key={c.id} className="pp-campaign">
                  <div className="pp-campaign-body">
                    <h3 className="pp-campaign-name">{c.name}</h3>
                    {c.description && <p className="pp-campaign-desc">{c.description}</p>}
                    <div className="pp-progress">
                      <div className="pp-progress-bar">
                        <span style={{ width: `${Math.min(100, Number(c.progress_pct) || 0)}%` }} />
                      </div>
                      <div className="pp-progress-meta">
                        <strong data-countup={c.collected_cents || 0}>{formatMoney(c.collected_cents || 0)}</strong>
                        <span>raised of {formatMoney(c.goal_cents)}</span>
                      </div>
                      {(c.donor_count > 0 || c.end_date) && (
                        <div className="pp-progress-sub">
                          {c.donor_count > 0 && <span>{c.donor_count} {c.donor_count === 1 ? 'donor' : 'donors'}</span>}
                          {c.donor_count > 0 && c.end_date && <span className="pp-dot-sep" aria-hidden>·</span>}
                          {c.end_date && <span>Closes {formatDate(c.end_date)}</span>}
                        </div>
                      )}
                    </div>
                    <button type="button" className="pp-btn pp-btn-primary pp-campaign-cta" onClick={() => onDonate(c.id)}>
                      Support this campaign
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== Podcast teaser ===== */}
      {latestPodcast.length > 0 && (
        <section className="pp-section" id="pp-podcast">
          <div className="pp-container">
            <div className="pp-section-head-row">
              <SectionHeader eyebrow={copy.podcast.eyebrow} title={copy.podcast.title} align="left" />
              <a className="pp-link-arrow" href={href('/podcast')}>All episodes <Icon name="arrow" size={14} /></a>
            </div>
            <div className="pp-podcast-teaser pp-reveal">
              <MediaEmbed
                url={latestPodcast[0].spotify_url || latestPodcast[0].apple_url || latestPodcast[0].youtube_url}
                title={latestPodcast[0].title}
              />
            </div>
          </div>
        </section>
      )}

      {/* ===== Give ===== */}
      <section id="give" className="pp-donate">
        <div className="pp-container pp-donate-inner pp-reveal">
          <span className="pp-eyebrow pp-eyebrow-light">{copy.give.eyebrow}</span>
          <h2 className="pp-section-title pp-section-title-light">{copy.give.title}</h2>
          <p className="pp-donate-text">{copy.give.text}</p>
          <button type="button" className="pp-btn pp-btn-light pp-donate-cta" onClick={onDonate}>
            <Icon name="heart" size={16} /> {copy.give.cta}
          </button>
          {church.ein && <p className="pp-donate-tax">EIN <code>{church.ein}</code> · 501(c)(3) — your gift is tax-deductible.</p>}
        </div>
      </section>

      {/* ===== Contact ===== */}
      <section id="contact" className="pp-section">
        <div className="pp-container pp-contact-grid pp-reveal">
          <div>
            <SectionHeader eyebrow={copy.contact.eyebrow} title={copy.contact.title} sub={copy.contact.sub} align="left" />
            <ul className="pp-contact-list">
              {contact.address && <li><Icon name="map" /><span>{contact.address}</span></li>}
              {contact.phone && <li><Icon name="phone" /><a href={`tel:${contact.phone}`}>{contact.phone}</a></li>}
              {contact.email && <li><Icon name="mail" /><a href={`mailto:${contact.email}`}>{contact.email}</a></li>}
            </ul>
          </div>
          {(contact.address || contact.map_url) && (
            <div className="pp-map-card">
              {contact.address && (
                <iframe
                  className="pp-map-embed"
                  title="Church location map"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(contact.address)}&z=15&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              )}
              <a
                href={contact.map_url || `https://maps.google.com/?q=${encodeURIComponent(contact.address || '')}`}
                target="_blank" rel="noopener noreferrer"
                className="pp-btn pp-btn-secondary pp-map-link"
              >
                <Icon name="map" /> Open in Google Maps
              </a>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
