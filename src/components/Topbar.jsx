import { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useChurch } from '../hooks/useChurch.js';
import { useT } from '../i18n/index.js';
import { useNotifications } from '../hooks/useNotifications.js';
import { formatRelativeTime } from '../lib/formatters.js';

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
  const { role, churchId } = useChurch();
  const t = useT();
  const { items: notifs, unread, markRead, markAll } = useNotifications(churchId);
  const [userOpen, setUserOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropRef = useRef(null);
  const notifRef = useRef(null);

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

  useEffect(() => {
    if (!notifOpen) return;
    const onDoc = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [notifOpen]);

  const onNotifClick = (n) => {
    if (n.status === 'unread') markRead(n.id);
    if (n.deep_link) window.location.hash = n.deep_link.replace(/^#/, '#');
    setNotifOpen(false);
  };

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
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button className="icon-btn" title={t('notif.title')} onClick={() => setNotifOpen((o) => !o)}>
            <Icon name="bell" />
            {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
          </button>
          {notifOpen && (
            <div className="dropdown notif-dropdown">
              <div className="notif-head">
                <strong>{t('notif.title')}</strong>
                {unread > 0 && <button className="btn btn-sm btn-ghost" onClick={markAll}>{t('notif.mark_all_read')}</button>}
              </div>
              <div className="notif-list">
                {notifs.length === 0 && <div className="notif-empty">{t('notif.empty')}</div>}
                {notifs.map((n) => (
                  <button key={n.id} className={`notif-item ${n.status === 'unread' ? 'unread' : ''}`} onClick={() => onNotifClick(n)}>
                    {n.status === 'unread' && <span className="notif-unread-dot" />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="notif-text">{t(n.title_key)}</div>
                      <div className="notif-time">{formatRelativeTime(n.created_at, { fallback: '' })}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
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
