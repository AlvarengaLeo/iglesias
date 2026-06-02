import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ChurchProvider } from './contexts/ChurchContext.jsx';
import { supabase } from './lib/supabase.js';
import { App } from './App.jsx';
import './styles/auth.css';
import './styles/polish.css';
import './styles/animations.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <AuthProvider client={supabase} signOutScope="local">
      <ChurchProvider>
        <App />
      </ChurchProvider>
    </AuthProvider>
  </StrictMode>
);
