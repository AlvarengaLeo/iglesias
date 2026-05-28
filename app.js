/* global React, ReactDOM, Sidebar, Topbar, Toast,
   InicioScreen, PersonasScreen, DonacionesScreen, PortalScreen, ReportesScreen, ConfiguracionScreen */

const {
  useState: useStateA,
  useEffect: useEffectA
} = React;
const SCREEN_META = {
  inicio: {
    title: 'Inicio',
    subtitle: 'Resumen general de actividad, donaciones y portal'
  },
  personas: {
    title: 'Personas',
    subtitle: 'Administra miembros, visitantes, donantes y servidores'
  },
  donaciones: {
    title: 'Donaciones',
    subtitle: 'Gestiona aportes, fondos, campañas y recibos'
  },
  portal: {
    title: 'Portal',
    subtitle: 'Administra la información pública de tu iglesia'
  },
  reportes: {
    title: 'Reportes',
    subtitle: 'Consulta el comportamiento de las donaciones y campañas'
  },
  configuracion: {
    title: 'Configuración',
    subtitle: 'Gestiona los ajustes principales de tu iglesia'
  }
};
const App = () => {
  // Read initial screen from URL hash so deep-linking works
  const initial = (window.location.hash || '#inicio').slice(1);
  const [screen, setScreen] = useStateA(SCREEN_META[initial] ? initial : 'inicio');
  const [toasts, setToasts] = useStateA([]);
  const [mobileNavOpen, setMobileNavOpen] = useStateA(false);
  useEffectA(() => {
    window.location.hash = screen;
    setMobileNavOpen(false);
  }, [screen]);
  useEffectA(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
  }, [mobileNavOpen]);
  const showToast = t => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, {
      ...t,
      id
    }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== id));
    }, 3500);
  };
  const meta = SCREEN_META[screen];
  return /*#__PURE__*/React.createElement("div", {
    className: `app ${mobileNavOpen ? 'mobile-nav-open' : ''}`
  }, /*#__PURE__*/React.createElement(Sidebar, {
    current: screen,
    onNavigate: setScreen,
    mobileOpen: mobileNavOpen,
    onMobileClose: () => setMobileNavOpen(false)
  }), mobileNavOpen && /*#__PURE__*/React.createElement("div", {
    className: "mobile-nav-overlay",
    onClick: () => setMobileNavOpen(false)
  }), /*#__PURE__*/React.createElement("main", {
    className: "main"
  }, /*#__PURE__*/React.createElement(Topbar, {
    title: meta.title,
    subtitle: meta.subtitle,
    onMenuClick: () => setMobileNavOpen(true)
  }), screen === 'inicio' && /*#__PURE__*/React.createElement(InicioScreen, {
    onToast: showToast,
    onAction: a => {
      if (a === 'donacion') setScreen('donaciones');else if (a === 'persona') setScreen('personas');else if (a === 'publicar') setScreen('portal');
    }
  }), screen === 'personas' && /*#__PURE__*/React.createElement(PersonasScreen, {
    onToast: showToast
  }), screen === 'donaciones' && /*#__PURE__*/React.createElement(DonacionesScreen, {
    onToast: showToast
  }), screen === 'portal' && /*#__PURE__*/React.createElement(PortalScreen, {
    onToast: showToast
  }), screen === 'reportes' && /*#__PURE__*/React.createElement(ReportesScreen, {
    onToast: showToast
  }), screen === 'configuracion' && /*#__PURE__*/React.createElement(ConfiguracionScreen, {
    onToast: showToast
  })), /*#__PURE__*/React.createElement("div", {
    className: "toast-wrap"
  }, toasts.map(t => /*#__PURE__*/React.createElement(Toast, {
    key: t.id,
    title: t.title,
    sub: t.sub,
    tone: t.tone || 'success',
    icon: t.icon || 'check'
  }))));
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(/*#__PURE__*/React.createElement(App, null));