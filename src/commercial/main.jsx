import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CommercialApp } from './CommercialApp.jsx';
import '../public/public-portal.css'; // brand tokens (--pp-*) + reveal/motion primitives
import './commercial.css';

// Gate cinematic motion (hero entrance, scroll reveals, 3D parallax) at the root
// BEFORE first paint so the initial hidden state applies without a flash. When
// the user prefers reduced motion, the class is never added → everything renders
// static & visible, and the 3D canvas is skipped entirely.
if (typeof window !== 'undefined'
  && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('pp-animate');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <CommercialApp />
  </StrictMode>
);
