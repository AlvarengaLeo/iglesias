import { useEffect, useState } from 'react';
import { getPublicSermonById } from '../api/portalContent.js';
import { Icon } from './Icon.jsx';
import { href } from './router.js';
import { MediaEmbed } from './MediaEmbed.jsx';
import { formatDate, formatDuration } from './helpers.js';

export function SermonDetailPage({ slug, id }) {
  const [state, setState] = useState({ loading: true, sermon: null, error: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, sermon: null, error: null });
    getPublicSermonById(slug, id)
      .then((s) => { if (alive) setState({ loading: false, sermon: s, error: s ? null : 'not_found' }); })
      .catch((e) => { if (alive) setState({ loading: false, sermon: null, error: e.message }); });
    return () => { alive = false; };
  }, [slug, id]);

  if (state.loading) {
    return <main className="pp-page"><div className="pp-page-spinner"><div className="pp-spinner" /></div></main>;
  }

  if (!state.sermon) {
    return (
      <main className="pp-page">
        <div className="pp-container pp-detail">
          <a className="pp-back-link" href={href('/sermons')}><Icon name="arrowLeft" size={16} /> Back to sermons</a>
          <p className="pp-empty">This sermon is unavailable.</p>
        </div>
      </main>
    );
  }

  const s = state.sermon;

  return (
    <main className="pp-page">
      <div className="pp-container pp-detail">
        <a className="pp-back-link" href={href('/sermons')}><Icon name="arrowLeft" size={16} /> Back to sermons</a>

        {s.video_url && <MediaEmbed url={s.video_url} title={s.title} />}

        <div className="pp-detail-meta">
          {s.series && (
            <a className="pp-tag" href={href(`/sermons`)}>{s.series}</a>
          )}
          <h1 className="pp-detail-title">{s.title}</h1>
          <div className="pp-card-meta pp-detail-submeta">
            {s.speaker && <span>{s.speaker}</span>}
            <span>{formatDate(s.sermon_date)}</span>
            {s.duration_seconds ? <span>{formatDuration(s.duration_seconds)}</span> : null}
          </div>
          {s.scripture_reference && (
            <div className="pp-detail-scripture"><Icon name="book" size={16} /> {s.scripture_reference}</div>
          )}
        </div>

        {s.audio_url && (
          <div className="pp-detail-audio">
            <h2 className="pp-detail-h2">Listen</h2>
            <audio controls preload="none" src={s.audio_url} className="pp-audio" />
          </div>
        )}

        {s.description && (
          <div className="pp-detail-body">
            {s.description.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
          </div>
        )}
      </div>
    </main>
  );
}
