// Shell principal de la app autenticada: Sidebar + Topbar + Screen activo + Toasts.
// Mantiene el routing por hash (#inicio, #personas, ...) compatible con el demo original.
import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { Toast } from './Toast.jsx';
import { InicioScreen } from '../screens/Inicio.jsx';
import { PersonasScreen } from '../screens/Personas.jsx';
import { DonacionesScreen } from '../screens/Donaciones.jsx';
import { PortalScreen } from '../screens/Portal.jsx';
import { ReportesScreen } from '../screens/Reportes.jsx';
import { ConfiguracionScreen } from '../screens/Configuracion.jsx';

const SCREEN_META = {
  inicio:        { title: 'Inicio',        subtitle: 'Resumen general de actividad, donaciones y portal' },
  personas:      { title: 'Personas',      subtitle: 'Administra miembros, visitantes, donantes y servidores' },
  donaciones:    { title: 'Donaciones',    subtitle: 'Gestiona aportes, fondos, campañas y recibos' },
  portal:        { title: 'Portal',        subtitle: 'Administra la información pública de tu iglesia' },
  reportes:      { title: 'Reportes',      subtitle: 'Consulta el comportamiento de las donaciones y campañas' },
  configuracion: { title: 'Configuración', subtitle: 'Gestiona los ajustes principales de tu iglesia' },
};

const getRoute = () => {
  const raw = window.location.hash.replace(/^#/, '').split('?')[0];
  return SCREEN_META[raw] ? raw : 'inicio';
};

export function AppShell() {
  const [screen, setScreen] = useState(getRoute());
  const [toasts, setToasts] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Sync screen with URL hash
  useEffect(() => {
    const onHashChange = () => setScreen(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    window.location.hash = '#' + screen;
    setMobileNavOpen(false);
  }, [screen]);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
  }, [mobileNavOpen]);

  const showToast = useCallback((t) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3500);
  }, []);

  const handleAction = (a) => {
    if (a === 'donacion') setScreen('donaciones');
    else if (a === 'persona') setScreen('personas');
    else if (a === 'publicar') setScreen('portal');
  };

  const meta = SCREEN_META[screen];

  return (
    <div className={`app ${mobileNavOpen ? 'mobile-nav-open' : ''}`}>
      <Sidebar
        current={screen}
        onNavigate={setScreen}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      {mobileNavOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileNavOpen(false)} />
      )}
      <main className="main">
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        {screen === 'inicio'        && <InicioScreen onToast={showToast} onAction={handleAction} />}
        {screen === 'personas'      && <PersonasScreen onToast={showToast} />}
        {screen === 'donaciones'    && <DonacionesScreen onToast={showToast} />}
        {screen === 'portal'        && <PortalScreen onToast={showToast} />}
        {screen === 'reportes'      && <ReportesScreen onToast={showToast} />}
        {screen === 'configuracion' && <ConfiguracionScreen onToast={showToast} />}
      </main>
      <div className="toast-wrap">
        {toasts.map((t) => (
          <Toast
            key={t.id}
            title={t.title}
            sub={t.sub}
            tone={t.tone || 'success'}
            icon={t.icon || 'check'}
          />
        ))}
      </div>
    </div>
  );
}
