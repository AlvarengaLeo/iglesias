import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { AuthLayout } from './AuthLayout.jsx';
import { PasswordInput } from './PasswordInput.jsx';

export function Login({ onNavigate }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos.'
          : err.message
      );
      return;
    }
  };

  return (
    <AuthLayout
      title="Inicia sesión"
      subtitle="Accede a la administración de tu iglesia."
      footer={
        <button
          type="button"
          className="subtle-link"
          onClick={() => onNavigate('reset-password')}
        >
          ¿Olvidaste tu contraseña?
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="field">
          <label htmlFor="login-email">Correo electrónico</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            placeholder="tu@iglesia.org"
          />
        </div>
        <div className="field">
          <label htmlFor="login-pass">Contraseña</label>
          <PasswordInput
            id="login-pass"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}
        <button
          type="submit"
          className="btn btn-primary auth-submit"
          disabled={loading}
        >
          {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
        </button>
      </form>
    </AuthLayout>
  );
}
