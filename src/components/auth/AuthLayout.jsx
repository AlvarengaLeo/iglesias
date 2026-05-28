// Layout compartido por páginas de autenticación.
// Tarjeta blanca centrada sobre fondo gradiente navy.
export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-shell">
      <div className="auth-bg" aria-hidden="true" />
      <div className="auth-card">
        <div className="auth-content">
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          {children}
        </div>
        {footer && <div className="auth-foot">{footer}</div>}
      </div>
    </div>
  );
}
