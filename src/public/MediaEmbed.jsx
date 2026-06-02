import { parseEmbed, youTubeThumbnail } from '../lib/embed.js';

// Responsive 16:9 (video) / compact (audio) embed. Builds the iframe src ONLY
// from the validated, reconstructed embedSrc returned by parseEmbed — never from
// the raw URL. Falls back to a safe link if the URL isn't a supported provider.
export function MediaEmbed({ url, title = 'Embedded media', compact = false }) {
  const parsed = parseEmbed(url);

  if (!parsed) {
    if (!url) return null;
    return (
      <a className="pp-embed-fallback" href={url} target="_blank" rel="noopener noreferrer">
        Open media in a new tab
      </a>
    );
  }

  const isAudio = parsed.kind === 'audio';
  const height = isAudio ? (compact ? 152 : 232) : undefined;

  return (
    <div className={isAudio ? 'pp-embed pp-embed-audio' : 'pp-embed pp-embed-video'}>
      <iframe
        src={parsed.embedSrc}
        title={title}
        loading="lazy"
        height={height}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}

// Resolve the best available poster image for a sermon (uploaded thumbnail
// preferred, else YouTube poster derived from the video URL).
export function posterFor({ thumbnail_url, video_url }) {
  return thumbnail_url || youTubeThumbnail(video_url) || null;
}
