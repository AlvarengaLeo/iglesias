import { Icon } from './Icon.jsx';
import { MediaEmbed, posterFor } from './MediaEmbed.jsx';
import { href } from './router.js';
import { formatDate, formatTime, formatDuration } from './helpers.js';
import { isSafeExternalUrl } from '../lib/embed.js';

// Eyebrow + title + optional subtitle. The editorial signature of the design.
export function SectionHeader({ eyebrow, title, sub, align = 'center' }) {
  return (
    <div className={`pp-section-header pp-align-${align}`}>
      {eyebrow && <span className="pp-eyebrow">{eyebrow}</span>}
      <h2 className="pp-section-title">{title}</h2>
      {sub && <p className="pp-section-sub">{sub}</p>}
    </div>
  );
}

export function SermonCard({ sermon }) {
  const poster = posterFor(sermon);
  return (
    <a className="pp-card pp-sermon-card" href={href(`/sermon/${sermon.id}`)}>
      <div className="pp-sermon-thumb">
        {poster ? <img src={poster} alt="" loading="lazy" /> : <div className="pp-thumb-empty"><Icon name="play" size={28} /></div>}
        <span className="pp-thumb-play"><Icon name="play" size={20} /></span>
      </div>
      <div className="pp-card-body">
        {sermon.series && <span className="pp-tag">{sermon.series}</span>}
        <h3 className="pp-card-title">{sermon.title}</h3>
        <div className="pp-card-meta">
          {sermon.speaker && <span>{sermon.speaker}</span>}
          <span>{formatDate(sermon.sermon_date)}</span>
        </div>
        {sermon.scripture_reference && (
          <div className="pp-card-scripture"><Icon name="book" size={14} /> {sermon.scripture_reference}</div>
        )}
      </div>
    </a>
  );
}

export function EventCard({ event }) {
  const start = new Date(event.starts_at);
  const month = Number.isNaN(start.getTime()) ? '' : start.toLocaleDateString('en-US', { month: 'short' });
  const day = Number.isNaN(start.getTime()) ? '' : start.getDate();
  return (
    <article className="pp-card pp-event-card">
      {event.image_url && <div className="pp-event-image"><img src={event.image_url} alt="" loading="lazy" /></div>}
      <div className="pp-card-body">
        <div className="pp-event-row">
          <div className="pp-date-chip" aria-hidden>
            <span className="pp-date-chip-month">{month}</span>
            <span className="pp-date-chip-day">{day}</span>
          </div>
          <div className="pp-event-main">
            <h3 className="pp-card-title">{event.title}</h3>
            <div className="pp-card-meta">
              <span><Icon name="clock" size={13} /> {formatDate(event.starts_at, { weekday: 'short', month: 'long', day: 'numeric' })} · {formatTime(event.starts_at)}</span>
            </div>
            {event.location && <div className="pp-card-meta"><span><Icon name="map" size={13} /> {event.location}</span></div>}
          </div>
        </div>
        {event.description && <p className="pp-card-desc">{event.description}</p>}
        {event.registration_url && isSafeExternalUrl(event.registration_url) && (
          <a className="pp-btn pp-btn-secondary pp-btn-sm" href={event.registration_url} target="_blank" rel="noopener noreferrer">
            Register <Icon name="external" size={14} />
          </a>
        )}
      </div>
    </article>
  );
}

const CATEGORY_LABEL = { ministry: 'Ministry', project: 'Project', mission: 'Mission' };

export function MinistryCard({ project, onDonate }) {
  const donatable = !!(project.campaign_id || project.fund_id) && typeof onDonate === 'function';
  return (
    <article className="pp-card pp-ministry-card">
      {project.image_url && <div className="pp-ministry-image"><img src={project.image_url} alt="" loading="lazy" /></div>}
      <div className="pp-card-body">
        <span className="pp-tag">{CATEGORY_LABEL[project.category] || 'Ministry'}</span>
        <h3 className="pp-card-title">{project.name}</h3>
        {project.leader_name && <div className="pp-card-meta"><span>Led by {project.leader_name}</span></div>}
        {project.description && <p className="pp-card-desc">{project.description}</p>}
        <div className="pp-card-actions">
          {donatable && (
            <button type="button" className="pp-btn pp-btn-primary pp-btn-sm"
              onClick={() => onDonate({ campaignId: project.campaign_id || null, fundId: project.fund_id || null })}>
              <Icon name="heart" size={14} /> Give
            </button>
          )}
          {project.link_url && isSafeExternalUrl(project.link_url) && (
            <a className="pp-link-arrow" href={project.link_url} target="_blank" rel="noopener noreferrer">
              Learn more <Icon name="arrow" size={14} />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export function EpisodeCard({ episode }) {
  const embedUrl = episode.spotify_url || episode.apple_url || episode.youtube_url;
  const label = [
    episode.season ? `S${episode.season}` : null,
    episode.episode_number ? `E${episode.episode_number}` : null,
  ].filter(Boolean).join(' · ');
  return (
    <article className="pp-card pp-episode-card">
      <div className="pp-episode-head">
        {episode.cover_image_url && <img className="pp-episode-cover" src={episode.cover_image_url} alt="" loading="lazy" />}
        <div className="pp-episode-info">
          {(label || episode.duration_seconds) && (
            <div className="pp-card-meta">
              {label && <span>{label}</span>}
              {episode.duration_seconds ? <span>{formatDuration(episode.duration_seconds)}</span> : null}
            </div>
          )}
          <h3 className="pp-card-title">{episode.title}</h3>
          {episode.description && <p className="pp-card-desc">{episode.description}</p>}
        </div>
      </div>
      {embedUrl && <MediaEmbed url={embedUrl} title={episode.title} compact />}
    </article>
  );
}
