import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ChurchProvider } from './contexts/ChurchContext.jsx';
import { App } from './App.jsx';
import './styles/auth.css';

const root = createRoot(document.getElementById('root'));
root.render(
  <StrictMode>
    <AuthProvider>
      <ChurchProvider>
        <App />
      </ChurchProvider>
    </AuthProvider>
  </StrictMode>
);
