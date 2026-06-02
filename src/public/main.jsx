import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PortalApp } from './PortalApp.jsx';
import './public-portal.css';

// Gate cinematic motion (hero entrance, scroll reveals, hero zoom) at the root
// BEFORE first paint so the initial hidden state applies without a flash.
// When the user prefers reduced motion, the class is never added → everything
// renders static and fully visible.
if (typeof window !== 'undefined'
  && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('pp-animate');
}

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <PortalApp />
  </StrictMode>
);
