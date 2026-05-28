/* global React, ReactDOM, Sidebar, Topbar, Toast,
   InicioScreen, PersonasScreen, DonacionesScreen, PortalScreen, ReportesScreen, ConfiguracionScreen */

// Print-mode entry: renders all 6 screens stacked for PDF export
const { useState, useEffect } = React;

const SCREENS = [
  { id: 'inicio', label: 'Inicio', subtitle: 'Resumen general de actividad, donaciones y portal', Comp: InicioScreen },
  { id: 'personas', label: 'Personas', subtitle: 'Administra miembros, visitantes, donantes y servidores', Comp: PersonasScreen },
  { id: 'donaciones', label: 'Donaciones', subtitle: 'Gestiona aportes, fondos, campañas y recibos', Comp: DonacionesScreen },
  { id: 'portal', label: 'Portal', subtitle: 'Administra la información pública de tu iglesia', Comp: PortalScreen },
  { id: 'reportes', label: 'Reportes', subtitle: 'Consulta el comportamiento de las donaciones y campañas', Comp: ReportesScreen },
  { id: 'configuracion', label: 'Configuración', subtitle: 'Gestiona los ajustes principales de tu iglesia', Comp: ConfiguracionScreen },
];

const noop = () => {};

const ScreenPage = ({ id, label, subtitle, Comp }) => (
  React.createElement('section', { className: 'print-page', 'data-screen': id },
    React.createElement('div', { className: 'app' },
      React.createElement(Sidebar, { current: id, onNavigate: noop }),
      React.createElement('main', { className: 'main' },
        React.createElement(Topbar, { title: label, subtitle: subtitle }),
        React.createElement(Comp, { onToast: noop, onAction: noop })
      )
    )
  )
);

const PrintApp = () => (
  React.createElement(React.Fragment, null,
    SCREENS.map(s => React.createElement(ScreenPage, { key: s.id, ...s }))
  )
);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(PrintApp, null));

// Auto-print after fonts + layout settle
const startPrint = () => {
  setTimeout(() => window.print(), 600);
};

if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    // wait one more frame for React to commit + ResizeObservers to fire
    requestAnimationFrame(() => requestAnimationFrame(startPrint));
  });
} else {
  setTimeout(startPrint, 1000);
}
