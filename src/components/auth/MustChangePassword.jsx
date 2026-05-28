import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import { AuthLayout } from './AuthLayout.jsx';
import { PasswordInput } from './PasswordInput.jsx';

export function MustChangePassword() {
  const { user, updatePassword, signOut } = useAuth();
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (pass1.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (pass1 !== pass2) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    const { error: err } = await updatePassword(pass1, /* clearMustChange */ true);
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    window.location.hash = '#inicio';
  };

  return (
    <AuthLayout
      title="Cambia tu contraseña"
      subtitle={`Por seguridad, debes establecer una nueva contraseña antes de continuar como ${user?.email}.`}
      footer={
        <button type="button" className="subtle-link" onClick={signOut}>
          Cerrar sesión
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="field">
          <label htmlFor="chg-p1">Nueva contraseña</label>
          <PasswordInput
            id="chg-p1"
            value={pass1}
            onChange={(e) => setPass1(e.target.value)}
            autoComplete="new-password"
            autoFocus
            placeholder="Mínimo 8 caracteres"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="chg-p2">Confirmar contraseña</label>
          <PasswordInput
            id="chg-p2"
            value={pass2}
            onChange={(e) => setPass2(e.target.value)}
            autoComplete="new-password"
            placeholder="Repite la contraseña"
            required
          />
        </div>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button
          type="submit"
          className="btn btn-primary auth-submit"
          disabled={loading}
        >
          {loading ? 'Guardando…' : 'Guardar y continuar'}
        </button>
      </form>
    </AuthLayout>
  );
}
