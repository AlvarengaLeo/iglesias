import { SectionHeader } from './cards.jsx';

// Photo gallery. Images live in portal_settings.published_data.media.gallery
// = [{ url, caption }]. Uploaded via the CRM (Portal → Watch & Media).
export function GalleryPage({ published }) {
  const media = published.media || {};
  const photos = Array.isArray(media.gallery) ? media.gallery.filter((g) => g && g.url) : [];

  return (
    <main className="pp-page">
      <div className="pp-container">
        <SectionHeader eyebrow="Multimedia" title="Gallery" sub="Moments from the life of our church." align="left" />
        {photos.length === 0 ? (
          <p className="pp-empty">No photos yet. Check back soon.</p>
        ) : (
          <div className="pp-gallery">
            {photos.map((g, i) => (
              <figure key={i} className="pp-gallery-item">
                <img src={g.url} alt={g.caption || ''} loading="lazy" />
                {g.caption && <figcaption>{g.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
