import { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { Login } from './components/auth/Login.jsx';
import { ResetPassword } from './components/auth/ResetPassword.jsx';
import { AcceptInvite } from './components/auth/AcceptInvite.jsx';
import { MustChangePassword } from './components/auth/MustChangePassword.jsx';
import { AppShell } from './components/AppShell.jsx';

// Hash-based routing. Soportado por el demo original; mantenemos por consistencia.
// Rutas auth (sin sesión): #login, #reset-password, #accept-invite
// Rutas app (con sesión):  #inicio, #personas, #donaciones, #portal, #reportes, #configuracion
function getRoute() {
  const raw = window.location.hash.replace(/^#/, '').split('?')[0] || '';
  return raw || 'inicio';
}

const PUBLIC_ROUTES = new Set(['login', 'reset-password', 'accept-invite']);

export function App() {
  const { user, loading, mustChangePassword } = useAuth();
  const [route, setRoute] = useState(getRoute());

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Detect Supabase recovery / invite flow via URL hash params
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      // Supabase auth detectSessionInUrl pone token en sesión; redirigimos al UI de change-password
      window.location.hash = '#change-password';
    } else if (hash.includes('type=invite')) {
      window.location.hash = '#accept-invite';
    }
  }, []);

  const navigate = (to) => {
    window.location.hash = '#' + to;
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading-spinner" />
      </div>
    );
  }

  // ---- Sin sesión ----
  if (!user) {
    if (route === 'reset-password') return <ResetPassword onNavigate={navigate} />;
    if (route === 'accept-invite') return <AcceptInvite onNavigate={navigate} />;
    return <Login onNavigate={navigate} />;
  }

  // ---- Con sesión pero password change forzado ----
  if (mustChangePassword) {
    return <MustChangePassword />;
  }

  // ---- Con sesión normal ----
  // accept-invite ya autenticado → redirige a inicio
  if (route === 'accept-invite' || route === 'login' || route === 'reset-password') {
    if (window.location.hash !== '#inicio') {
      window.location.hash = '#inicio';
    }
  }

  return <AppShell />;
}
