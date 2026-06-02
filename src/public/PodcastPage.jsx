import { useEffect, useState, useCallback } from 'react';
import { getPublicPodcastBySlug } from '../api/portalContent.js';
import { SectionHeader, EpisodeCard } from './cards.jsx';

const PAGE = 12;

export function PodcastPage({ slug }) {
  const [state, setState] = useState({ loading: true, items: [], total: 0, error: null });

  const load = useCallback(async (offset, replace) => {
    try {
      const res = await getPublicPodcastBySlug(slug, { limit: PAGE, offset });
      setState((prev) => ({
        loading: false,
        error: null,
        total: res.total,
        items: replace ? res.items : [...prev.items, ...res.items],
      }));
    } catch (e) {
      setState((prev) => ({ ...prev, loading: false, error: e.message }));
    }
  }, [slug]);

  useEffect(() => { load(0, true); }, [load]);

  const canLoadMore = state.items.length < state.total;

  return (
    <main className="pp-page">
      <div className="pp-container">
        <SectionHeader eyebrow="Listen" title="Podcast" sub="Tune in to our latest conversations and teachings." align="left" />

        {state.loading ? (
          <div className="pp-page-spinner"><div className="pp-spinner" /></div>
        ) : state.error ? (
          <p className="pp-empty">Something went wrong loading episodes.</p>
        ) : state.items.length === 0 ? (
          <p className="pp-empty">No episodes yet. Check back soon.</p>
        ) : (
          <>
            <div className="pp-episode-list">
              {state.items.map((e) => <EpisodeCard key={e.id} episode={e} />)}
            </div>
            {canLoadMore && (
              <div className="pp-load-more-wrap">
                <button type="button" className="pp-btn pp-btn-secondary pp-load-more" onClick={() => load(state.items.length, false)}>
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
