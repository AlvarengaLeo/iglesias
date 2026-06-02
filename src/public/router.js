// Lightweight zero-dependency hash router for the public portal.
// Mirrors the house pattern in src/App.jsx (hashchange + getRoute).
//
// The church slug lives in window.location.search (?slug=...) and is NEVER
// touched here — we only read/write window.location.hash. So navigating
// between pages preserves ?slug automatically.
//
// Routes:
//   #/                -> { name: 'home',    param: null }
//   #/sermons         -> { name: 'sermons', param: null }
//   #/sermon/:id      -> { name: 'sermon',  param: id }
//   #/podcast         -> { name: 'podcast', param: null }
//   #/events          -> { name: 'events',  param: null }
//   #/ministries      -> { name: 'ministries', param: null }

import { useEffect, useState } from 'react';

const KNOWN = new Set(['home', 'sermons', 'sermon', 'podcast', 'events', 'ministries', 'about', 'gallery']);

export function parseRoute() {
  const raw = window.location.hash.replace(/^#/, '');
  const path = raw.split('?')[0].replace(/^\/+|\/+$/g, '');
  if (!path) return { name: 'home', param: null };
  const [name, param] = path.split('/');
  if (!KNOWN.has(name)) return { name: 'home', param: null };
  return { name, param: param || null };
}

export function navigate(path) {
  // path is like '/sermons' or '/sermon/abc'. Only the hash changes.
  window.location.hash = path.startsWith('/') ? path : `/${path}`;
}

// Build an href for an anchor tag (keeps the back button working natively).
export function href(path) {
  return `#${path.startsWith('/') ? path : `/${path}`}`;
}

export function useRoute() {
  const [route, setRoute] = useState(parseRoute());
  useEffect(() => {
    const onChange = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
