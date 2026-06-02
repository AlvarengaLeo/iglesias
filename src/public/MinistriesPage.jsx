import { useEffect, useState } from 'react';
import { getPublicProjectsBySlug } from '../api/portalContent.js';
import { SectionHeader, MinistryCard } from './cards.jsx';

export function MinistriesPage({ slug, onDonate }) {
  const [state, setState] = useState({ loading: true, items: [], error: null });

  useEffect(() => {
    let alive = true;
    getPublicProjectsBySlug(slug)
      .then((items) => { if (alive) setState({ loading: false, items, error: null }); })
      .catch((e) => { if (alive) setState({ loading: false, items: [], error: e.message }); });
    return () => { alive = false; };
  }, [slug]);

  return (
    <main className="pp-page">
      <div className="pp-container">
        <SectionHeader eyebrow="Get Involved" title="Ministries & Projects" sub="Find a place to belong and serve." align="left" />
        {state.loading ? (
          <div className="pp-page-spinner"><div className="pp-spinner" /></div>
        ) : state.error ? (
          <p className="pp-empty">Something went wrong loading ministries.</p>
        ) : state.items.length === 0 ? (
          <p className="pp-empty">Nothing to show yet. Check back soon.</p>
        ) : (
          <div className="pp-card-grid pp-grid-3">
            {state.items.map((p) => <MinistryCard key={p.id} project={p} onDonate={onDonate} />)}
          </div>
        )}
      </div>
    </main>
  );
}
