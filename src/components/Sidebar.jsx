import { Icon } from './Icon.jsx';
import { useChurch } from '../hooks/useChurch.js';
import { useRole } from '../hooks/useRole.js';
import { useT } from '../i18n/index.js';

// Roles de staff (todos menos 'servidor'): ven el CRM completo.
const STAFF_ROLES = ['admin', 'pastor', 'treasurer', 'secretary', 'leader', 'viewer'];

const NAV_ITEMS = [
  { id: 'inicio',        label: 'Inicio',        icon: 'home',      roles: STAFF_ROLES },
  { id: 'personas',      label: 'Personas',      icon: 'users',     roles: STAFF_ROLES },
  { id: 'donaciones',    label: 'Donaciones',    icon: 'handHeart', roles: STAFF_ROLES },
  { id: 'equipos',       labelKey: 'nav.teams',  icon: 'calendar',  roles: ['admin', 'pastor', 'secretary', 'leader', 'servidor'] },
  { id: 'portal',        label: 'Portal',        icon: 'globe',     roles: STAFF_ROLES },
  { id: 'reportes',      label: 'Reportes',      icon: 'barChart',  roles: STAFF_ROLES },
  { id: 'configuracion', label: 'Configuración', icon: 'settings',  roles: STAFF_ROLES },
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
  const { role } = useRole();
  const t = useT();

  const publicName = church?.public_name || 'Sin iglesia';
  const logoInitials = initials(publicName);

  // UI reducida por rol: un 'servidor' solo ve Equipos.
  const items = role ? NAV_ITEMS.filter((it) => it.roles.includes(role)) : [];

  return (
    <aside className={`sidebar ${mobileOpen ? 'sidebar-mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">
          {church?.logo_url ? (
            <img
              src={church.logo_url}
              alt={publicName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
            />
          ) : (
            logoInitials
          )}
        </div>
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
      {items.map((it) => (
        <button
          key={it.id}
          className={`nav-item ${current === it.id ? 'active' : ''}`}
          onClick={() => onNavigate(it.id)}
        >
          <Icon name={it.icon} />
          {it.labelKey ? t(it.labelKey) : it.label}
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
