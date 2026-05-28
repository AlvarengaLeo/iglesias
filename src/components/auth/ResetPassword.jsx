import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { AuthLayout } from './AuthLayout.jsx';

export function ResetPassword({ onNavigate }) {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await sendPasswordReset(email.trim());
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  return (
    <AuthLayout
      title="Recuperar contraseña"
      subtitle={
        sent
          ? 'Te enviamos un enlace para reestablecer tu contraseña.'
          : 'Te enviaremos un enlace al correo registrado.'
      }
      footer={
        <button type="button" className="subtle-link" onClick={() => onNavigate('login')}>
          ← Volver a inicio de sesión
        </button>
      }
    >
      {sent ? (
        <div className="auth-success">
          <p>Revisa tu bandeja de entrada en <strong>{email}</strong>.</p>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            Si no llega en 5 minutos, revisa la carpeta de spam o vuelve a intentar.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
              placeholder="tu@iglesia.org"
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button
            type="submit"
            className="btn btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
