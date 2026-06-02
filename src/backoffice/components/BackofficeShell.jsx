import { useState, useEffect, useCallback } from 'react';
import { EbSidebar } from './EbSidebar.jsx';
import { EbTopbar } from './EbTopbar.jsx';
import { Toast } from '../../components/Toast.jsx';
import { Dashboard } from '../screens/Dashboard.jsx';
import { Iglesias } from '../screens/Iglesias.jsx';
import { Leads } from '../screens/Leads.jsx';
import { Facturacion } from '../screens/Facturacion.jsx';
import { Soporte } from '../screens/Soporte.jsx';
import { Configuracion } from '../screens/Configuracion.jsx';
import { Placeholder } from '../screens/Placeholder.jsx';

const META = {
  dashboard:     { title: 'Dashboard',     subtitle: 'Analítica del negocio EB Connect' },
  iglesias:      { title: 'Iglesias',      subtitle: 'Administra las iglesias-cliente' },
  leads:         { title: 'Leads',         subtitle: 'Captación y conversión a iglesia' },
  facturacion:   { title: 'Facturación',   subtitle: 'Suscripciones y pagos de las iglesias' },
  soporte:       { title: 'Soporte',       subtitle: 'Tickets de las iglesias' },
  configuracion: { title: 'Configuración', subtitle: 'Planes, flags, usuarios internos, auditoría' },
};
const getRoute = () => {
  const r = window.location.hash.replace(/^#/, '').split('?')[0];
  return META[r] ? r : 'dashboard';
};

// Pantallas keep-alive: montadas una vez y mantenidas vivas (ocultas con
// display:none) para que volver a un módulo sea instantáneo, sin refetch.
// No hay pantallas realtime en el backoffice → todas uniformes.
const KEEPALIVE = ['dashboard', 'iglesias', 'leads', 'facturacion', 'soporte', 'configuracion'];

export function BackofficeShell() {
  const [screen, setScreen] = useState(getRoute());
  const [toasts, setToasts] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [visited, setVisited] = useState(() => new Set([getRoute()]));

  useEffect(() => {
    const f = () => setScreen(getRoute());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  useEffect(() => {
    window.location.hash = '#' + screen;
    setMobileNavOpen(false);
    setVisited((prev) => (prev.has(screen) ? prev : new Set(prev).add(screen)));
  }, [screen]);
  useEffect(() => { document.body.style.overflow = mobileNavOpen ? 'hidden' : ''; }, [mobileNavOpen]);

  const showToast = useCallback((t) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { ...t, id }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 3500);
  }, []);

  const renderScreen = (id) => {
    switch (id) {
      case 'dashboard':     return <Dashboard onToast={showToast} onNavigate={setScreen} />;
      case 'iglesias':      return <Iglesias onToast={showToast} />;
      case 'leads':         return <Leads onToast={showToast} />;
      case 'facturacion':   return <Facturacion onToast={showToast} />;
      case 'soporte':       return <Soporte onToast={showToast} />;
      case 'configuracion': return <Configuracion onToast={showToast} />;
      default:              return null;
    }
  };

  const meta = META[screen];

  return (
    <div className={`app ${mobileNavOpen ? 'mobile-nav-open' : ''}`}>
      <EbSidebar current={screen} onNavigate={setScreen} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      {mobileNavOpen && <div className="mobile-nav-overlay" onClick={() => setMobileNavOpen(false)} />}
      <main className="main">
        <EbTopbar title={meta.title} subtitle={meta.subtitle} onMenuClick={() => setMobileNavOpen(true)} />
        {KEEPALIVE.filter((id) => visited.has(id)).map((id) => (
          <div key={id} style={{ display: screen === id ? 'contents' : 'none' }}>
            {renderScreen(id)}
          </div>
        ))}
      </main>
      <div className="toast-wrap">
        {toasts.map((t) => (
          <Toast key={t.id} title={t.title} sub={t.sub} tone={t.tone || 'success'} icon={t.icon || 'check'} />
        ))}
      </div>
    </div>
  );
}
