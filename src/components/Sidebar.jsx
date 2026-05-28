import { Icon } from './Icon.jsx';
import { useChurch } from '../hooks/useChurch.js';

const NAV_ITEMS = [
  { id: 'inicio',        label: 'Inicio',        icon: 'home' },
  { id: 'personas',      label: 'Personas',      icon: 'users' },
  { id: 'donaciones',    label: 'Donaciones',    icon: 'handHeart' },
  { id: 'portal',        label: 'Portal',        icon: 'globe' },
  { id: 'reportes',      label: 'Reportes',      icon: 'barChart' },
  { id: 'configuracion', label: 'Configuración', icon: 'settings' },
];

const planLabel = (plan) => {
  if (plan === 'enterprise') return 'Plan Enterprise · Activo';
  if (plan === 'comunidad') return 'Plan Comunidad · Activo';
  return 'Plan Ministerio · Activo';
};

const initials = (name) => {
  if (!name) return '··';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
};

export function Sidebar({ current, onNavigate, mobileOpen = false, onMobileClose }) {
  const { church } = useChurch();

  const publicName = church?.public_name || 'Sin iglesia';
  const logoInitials = initials(publicName);

  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">{logoInitials}</div>
        <div className="sidebar-brand-text">
          <strong>{publicName}</strong>
          <span>{planLabel(church?.plan)}</span>
        </div>
        <button
          className="sidebar-close"
          onClick={onMobileClose}
          aria-label="Cerrar menú"
        >
          <Icon name="x" size={18} />
        </button>
      </div>
      <div className="sidebar-section-label">Menú principal</div>
      {NAV_ITEMS.map((it) => (
        <button
          key={it.id}
          className={`nav-item ${current === it.id ? 'active' : ''}`}
          onClick={() => onNavigate(it.id)}
        >
          <Icon name={it.icon} />
          {it.label}
        </button>
      ))}
      <div className="sidebar-foot">
        <div className="sidebar-foot-title">¿Necesitas ayuda?</div>
        <div className="sidebar-foot-text">
          Habla con nuestro equipo o consulta la guía pastoral.
        </div>
        <button type="button">Contactar soporte</button>
      </div>
    </aside>
  );
}
