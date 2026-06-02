import { useEffect, useState, useCallback } from 'react';
import { getPublicSermonsBySlug } from '../api/portalContent.js';
import { SectionHeader, SermonCard } from './cards.jsx';

const PAGE = 12;

export function SermonsPage({ slug }) {
  const [series, setSeries] = useState(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [state, setState] = useState({ loading: true, items: [], total: 0, seriesList: [], error: null });

  // debounce the search box (matches the 300ms pattern used elsewhere)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (offset, replace) => {
    try {
      const res = await getPublicSermonsBySlug(slug, { limit: PAGE, offset, series });
      setState((prev) => ({
        loading: false,
        error: null,
        total: res.total,
        seriesList: res.series.length ? res.series : prev.seriesList,
        items: replace ? res.items : [...prev.items, ...res.items],
      }));
    } catch (e) {
      setState((prev) => ({ ...prev, loading: false, error: e.message }));
    }
  }, [slug, series]);

  useEffect(() => {
    setState((p) => ({ ...p, loading: true, items: [] }));
    load(0, true);
  }, [load]);

  // client-side title/speaker/scripture filter on already-loaded items
  const visible = debounced
    ? state.items.filter((s) =>
        [s.title, s.speaker, s.scripture_reference, s.series]
          .filter(Boolean).join(' ').toLowerCase().includes(debounced))
    : state.items;

  const canLoadMore = !debounced && state.items.length < state.total;

  return (
    <main className="pp-page">
      <div className="pp-container">
        <SectionHeader eyebrow="Messages" title="Sermons" sub="Browse and revisit past messages." align="left" />

        <div className="pp-filter-bar">
          <input
            type="search"
            className="pp-search"
            placeholder="Search by title, speaker, or passage…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search sermons"
          />
          {state.seriesList.length > 0 && (
            <select
              className="pp-filter"
              value={series || ''}
              onChange={(e) => setSeries(e.target.value || null)}
              aria-label="Filter by series"
            >
              <option value="">All series</option>
              {state.seriesList.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {state.loading ? (
          <div className="pp-page-spinner"><div className="pp-spinner" /></div>
        ) : state.error ? (
          <p className="pp-empty">Something went wrong loading sermons.</p>
        ) : visible.length === 0 ? (
          <p className="pp-empty">No sermons found.</p>
        ) : (
          <>
            <div className="pp-card-grid pp-grid-3">
              {visible.map((s) => <SermonCard key={s.id} sermon={s} />)}
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
