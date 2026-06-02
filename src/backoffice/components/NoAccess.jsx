import { useAuth } from '../../contexts/AuthContext.jsx';

export function NoAccess() {
  const { user, signOut } = useAuth();
  return (
    <div className="eb-auth">
      <div className="eb-auth-card" style={{ textAlign: 'center' }}>
        <div className="eb-auth-brand">EB Connect</div>
        <div className="eb-auth-sub">Backoffice</div>
        <p style={{ color: 'var(--muted)', margin: '14px 0 18px', fontSize: 14 }}>
          La cuenta <strong>{user?.email}</strong> no tiene acceso al Backoffice de EB Connect.
        </p>
        <button className="btn btn-secondary" onClick={signOut} style={{ width: '100%', justifyContent: 'center' }}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
