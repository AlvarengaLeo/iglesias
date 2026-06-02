import { Icon } from '../../components/Icon.jsx';
import { useEbRole } from '../hooks/useEbRole.js';

const NAV = [
  { id: 'dashboard',     label: 'Dashboard',     icon: 'barChart',   perm: null },
  { id: 'iglesias',      label: 'Iglesias',      icon: 'globe',      perm: 'churches.view' },
  { id: 'leads',         label: 'Leads',         icon: 'users',      perm: 'leads.view' },
  { id: 'facturacion',   label: 'Facturación',   icon: 'creditCard', perm: 'billing.view' },
  { id: 'soporte',       label: 'Soporte',       icon: 'fileText',   perm: 'support.view' },
  { id: 'configuracion', label: 'Configuración', icon: 'settings',   perm: 'config.manage' },
];

export function EbSidebar({ current, onNavigate, mobileOpen = false, onMobileClose }) {
  const { can } = useEbRole();
  const items = NAV.filter((n) => !n.perm || can(n.perm));

  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <img className="eb-bo-logo" src="/logo-web.png" alt="EB Connect" />
        <button className="sidebar-close" onClick={onMobileClose} aria-label="Cerrar menú">
          <Icon name="x" size={18} />
        </button>
      </div>
      <div className="sidebar-section-label">Panel interno</div>
      {items.map((it) => (
        <button
          key={it.id}
          className={`nav-item ${current === it.id ? 'active' : ''}`}
          onClick={() => onNavigate(it.id)}
        >
          <Icon name={it.icon} /> {it.label}
        </button>
      ))}
    </aside>
  );
}
