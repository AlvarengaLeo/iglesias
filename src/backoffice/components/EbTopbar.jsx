import { useState, useRef, useEffect } from 'react';
import { Icon } from '../../components/Icon.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useEb } from '../contexts/EbContext.jsx';

const ROLE_LABEL = {
  super_admin: 'Super Admin', sales: 'Ventas', support: 'Soporte',
  billing: 'Facturación', tech: 'Técnico', viewer: 'Solo lectura',
};
const initials = (s) => (s ? s.split(/[\s.@]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') : '··');

export function EbTopbar({ title, subtitle, onMenuClick }) {
  const { user, signOut } = useAuth();
  const { staff } = useEb();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const f = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', f);
    return () => document.removeEventListener('mousedown', f);
  }, [open]);

  const name = staff?.full_name || user?.email?.split('@')[0] || 'Staff';

  return (
    <header className="topbar">
      <button className="topbar-menu-btn" onClick={onMenuClick} aria-label="Abrir menú">
        <Icon name="menu" size={20} />
      </button>
      <div className="topbar-title">
        <h1>{title}</h1>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="topbar-right">
        <div style={{ position: 'relative' }} ref={ref}>
          <button className="topbar-user" onClick={() => setOpen((o) => !o)}>
            <div className="avatar">{initials(staff?.full_name || user?.email)}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span className="name">{name}</span>
              <span className="role">{ROLE_LABEL[staff?.role] || ''}</span>
            </div>
            <Icon name="chevronDown" size={14} />
          </button>
          {open && (
            <div className="dropdown">
              <button className="dropdown-item" onClick={() => { setOpen(false); signOut(); }}>
                <Icon name="logOut" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
