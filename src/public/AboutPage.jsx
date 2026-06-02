import { SectionHeader } from './cards.jsx';

// About / Our Story + What We Believe. Content lives in portal_settings.published_data
// ({ about: { headline, story, mission, vision }, beliefs: { intro, items: [{title,text}] } }).
export function AboutPage({ published, publicName }) {
  const about = published.about || {};
  const beliefs = published.beliefs || {};
  const items = Array.isArray(beliefs.items) ? beliefs.items : [];
  const paras = (t) => String(t || '').split(/\n{2,}/).filter(Boolean);

  return (
    <main className="pp-page">
      <div className="pp-container pp-prose-page">
        <SectionHeader eyebrow="About" title={about.headline || `About ${publicName}`} sub={about.tagline} align="left" />

        {about.story && (
          <div className="pp-prose">
            {paras(about.story).map((p, i) => <p key={i}>{p}</p>)}
          </div>
        )}

        {(about.mission || about.vision) && (
          <div className="pp-card-grid pp-grid-2" style={{ marginTop: 36 }}>
            {about.mission && (
              <div className="pp-card pp-info-card">
                <h3 className="pp-card-title">Our Mission</h3>
                <p className="pp-card-desc" style={{ WebkitLineClamp: 'unset' }}>{about.mission}</p>
              </div>
            )}
            {about.vision && (
              <div className="pp-card pp-info-card">
                <h3 className="pp-card-title">Our Vision</h3>
                <p className="pp-card-desc" style={{ WebkitLineClamp: 'unset' }}>{about.vision}</p>
              </div>
            )}
          </div>
        )}

        {items.length > 0 && (
          <section style={{ marginTop: 64 }}>
            <SectionHeader eyebrow="Faith" title="What We Believe" sub={beliefs.intro} align="left" />
            <div className="pp-beliefs">
              {items.map((it, i) => (
                <div key={i} className="pp-belief">
                  <h3 className="pp-belief-title">{it.title}</h3>
                  {it.text && <p className="pp-belief-text">{it.text}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {!about.story && items.length === 0 && (
          <p className="pp-empty">This church hasn't added their story yet.</p>
        )}
      </div>
    </main>
  );
}
