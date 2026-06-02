import { useEffect, useState } from 'react';
import { getPublicEventsBySlug } from '../api/portalContent.js';
import { SectionHeader, EventCard } from './cards.jsx';

export function EventsPage({ slug }) {
  const [state, setState] = useState({ loading: true, items: [], error: null });

  useEffect(() => {
    let alive = true;
    getPublicEventsBySlug(slug)
      .then((items) => { if (alive) setState({ loading: false, items, error: null }); })
      .catch((e) => { if (alive) setState({ loading: false, items: [], error: e.message }); });
    return () => { alive = false; };
  }, [slug]);

  return (
    <main className="pp-page">
      <div className="pp-container">
        <SectionHeader eyebrow="Calendar" title="Events" sub="What's coming up at our church." align="left" />
        {state.loading ? (
          <div className="pp-page-spinner"><div className="pp-spinner" /></div>
        ) : state.error ? (
          <p className="pp-empty">Something went wrong loading events.</p>
        ) : state.items.length === 0 ? (
          <p className="pp-empty">No upcoming events right now. Check back soon.</p>
        ) : (
          <div className="pp-card-grid pp-grid-2">
            {state.items.map((e) => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </div>
    </main>
  );
}
