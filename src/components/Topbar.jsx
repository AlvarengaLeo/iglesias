import { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useChurch } from '../hooks/useChurch.js';

const initials = (str) => {
  if (!str) return '··';
  return str
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
};

const roleLabel = (role) => {
  return {
    admin: 'Admin',
    pastor: 'Pastor',
    treasurer: 'Tesorero',
    secretary: 'Secretaria',
    leader: 'Líder',
    viewer: 'Solo lectura',
  }[role] || role || '';
};

export function Topbar({ title, subtitle, onMenuClick }) {
  const { user, signOut } = useAuth();
  const { role } = useChurch();
  const [userOpen, setUserOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    if (!userOpen) return;
    const onDoc = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setUserOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [userOpen]);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Usuario';
  const avatar = initials(user?.user_metadata?.full_name || user?.email);

  return (
    <header className="topbar">
      <button
        className="topbar-menu-btn"
        onClick={onMenuClick}
        aria-label="Abrir menú"
      >
        <Icon name="menu" size={20} />
      </button>
      <div className="topbar-title">
        <h1>{title}</h1>
        {subtitle && <span>{subtitle}</span>}
      </div>
      <div className="topbar-right">
        <button className="icon-btn" title="Notificaciones">
          <Icon name="bell" />
          <span className="dot"></span>
        </button>
        <div style={{ position: 'relative' }} ref={dropRef}>
          <button className="topbar-user" onClick={() => setUserOpen((o) => !o)}>
            <div className="avatar">{avatar}</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span className="name">{displayName}</span>
              <span className="role">{roleLabel(role)}</span>
            </div>
            <Icon name="chevronDown" size={14} />
          </button>
          {userOpen && (
            <div className="dropdown">
              <button className="dropdown-item" onClick={() => setUserOpen(false)}>
                <Icon name="user" />Mi perfil
              </button>
              <button className="dropdown-item" onClick={() => setUserOpen(false)}>
                <Icon name="settings" />Preferencias
              </button>
              <button className="dropdown-item" onClick={() => setUserOpen(false)}>
                <Icon name="book" />Centro de ayuda
              </button>
              <div className="dropdown-sep"></div>
              <button
                className="dropdown-item"
                onClick={() => {
                  setUserOpen(false);
                  signOut();
                }}
              >
                <Icon name="logOut" />Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
