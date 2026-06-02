import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '../contexts/AuthContext.jsx';
import { supabase as backofficeClient } from './lib/supabase.js';
import { EbProvider } from './contexts/EbContext.jsx';
import { BackofficeApp } from './BackofficeApp.jsx';
import '../styles/auth.css';
import '../styles/polish.css';
import './eb.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider client={backofficeClient} signOutScope="local">
      <EbProvider>
        <BackofficeApp />
      </EbProvider>
    </AuthProvider>
  </StrictMode>
);
