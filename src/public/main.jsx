import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicPortal } from './PublicPortal.jsx';
import './public-portal.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <PublicPortal />
  </StrictMode>
);
