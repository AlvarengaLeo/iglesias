// Shell principal de la app autenticada: Sidebar + Topbar + Screen activo + Toasts.
// Mantiene el routing por hash (#inicio, #personas, ...) compatible con el demo original.
import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { Toast } from './Toast.jsx';
import { useRole } from '../hooks/useRole.js';
import { InicioScreen } from '../screens/Inicio.jsx';
import { PersonasScreen } from '../screens/Personas.jsx';
import { DonacionesScreen } from '../screens/Donaciones.jsx';
import { PortalScreen } from '../screens/Portal.jsx';
import { ReportesScreen } from '../screens/Reportes.jsx';
import { ConfiguracionScreen } from '../screens/Configuracion.jsx';
import { EquiposScreen } from '../screens/Equipos.jsx';

const SCREEN_META = {
  inicio:        { title: 'Inicio',        subtitle: 'Resumen general de actividad, donaciones y portal' },
  personas:      { title: 'Personas',      subtitle: 'Administra miembros, visitantes, donantes y servidores' },
  donaciones:    { title: 'Donaciones',    subtitle: 'Gestiona aportes, fondos, campañas y recibos' },
  equipos:       { title: 'Equipos',       subtitle: 'Planifica servicios, equipos y coordina a quienes sirven' },
  portal:        { title: 'Portal',        subtitle: 'Administra la información pública de tu iglesia' },
  reportes:      { title: 'Reportes',      subtitle: 'Consulta el comportamiento de las donaciones y campañas' },
  configuracion: { title: 'Configuración', subtitle: 'Gestiona los ajustes principales de tu iglesia' },
};

// Defensa en profundidad (la data real igual está protegida por RLS).
const STAFF_ROLES = ['admin', 'pastor', 'treasurer', 'secretary', 'leader', 'viewer'];
const SCREEN_ROLES = {
  inicio: STAFF_ROLES,
  personas: STAFF_ROLES,
  donaciones: STAFF_ROLES,
  equipos: ['admin', 'pastor', 'secretary', 'leader', 'servidor'],
  portal: STAFF_ROLES,
  reportes: STAFF_ROLES,
  configuracion: STAFF_ROLES,
};

const homeForRole = (role) => (role === 'servidor' ? 'equipos' : 'inicio');

// Pantallas con keep-alive: se montan al primer uso y se mantienen vivas
// (ocultas con display:none) para que volver a ellas sea instantáneo, sin
// remontaje ni refetch. 'equipos' queda FUERA a propósito: abre canales
// realtime de Supabase que deben cerrarse al salir (ver useChat.js).
const KEEPALIVE = ['inicio', 'personas', 'donaciones', 'portal', 'reportes', 'configuracion'];

const getRoute = () => {
  const raw = window.location.hash.replace(/^#/, '').split('?')[0];
  return SCREEN_META[raw] ? raw : 'inicio';
};

export function AppShell() {
  const { role } = useRole();
  const [screen, setScreen] = useState(getRoute());
  const [toasts, setToasts] = useState([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Pantallas keep-alive ya montadas (se mantienen vivas al cambiar de módulo).
  const [visited, setVisited] = useState(() => {
    const r = getRoute();
    return new Set(KEEPALIVE.includes(r) ? [r] : []);
  });

  // Guard por rol: rebota a la pantalla de inicio del rol si no tiene acceso.
  useEffect(() => {
    if (!role) return;
    const allowed = SCREEN_ROLES[screen] || STAFF_ROLES;
    if (!allowed.includes(role)) setScreen(homeForRole(role));
  }, [role, screen]);

  // Sync screen with URL hash
  useEffect(() => {
    const onHashChange = () => setScreen(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    window.location.hash = '#' + screen;
    setMobileNavOpen(false);
    if (KEEPALIVE.includes(screen)) {
      setVisited((prev) => (prev.has(screen) ? prev : new Set(prev).add(screen)));
    }
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

  const handleAction = useCallback((a) => {
    if (a === 'donacion') setScreen('donaciones');
    else if (a === 'persona') setScreen('personas');
    else if (a === 'publicar') setScreen('portal');
  }, []);

  // Cada pantalla keep-alive con sus props. Se renderiza una vez y se mantiene
  // montada; sólo se alterna su visibilidad (display) al cambiar de módulo.
  const renderScreen = (id) => {
    switch (id) {
      case 'inicio':        return <InicioScreen onToast={showToast} onAction={handleAction} />;
      case 'personas':      return <PersonasScreen onToast={showToast} />;
      case 'donaciones':    return <DonacionesScreen onToast={showToast} />;
      case 'portal':        return <PortalScreen onToast={showToast} />;
      case 'reportes':      return <ReportesScreen onToast={showToast} />;
      case 'configuracion': return <ConfiguracionScreen onToast={showToast} />;
      default:              return null;
    }
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
        {KEEPALIVE.filter((id) => visited.has(id)).map((id) => (
          <div key={id} style={{ display: screen === id ? 'contents' : 'none' }}>
            {renderScreen(id)}
          </div>
        ))}
        {screen === 'equipos' && <EquiposScreen onToast={showToast} />}
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
