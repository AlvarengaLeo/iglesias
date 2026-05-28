import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase.js';
import { AuthLayout } from './AuthLayout.jsx';
import { PasswordInput } from './PasswordInput.jsx';

export function AcceptInvite({ onNavigate }) {
  const [pass1, setPass1] = useState('');
  const [pass2, setPass2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [invitedEmail, setInvitedEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setInvitedEmail(data.user.email);
    });
  }, []);

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
    const { error: err } = await supabase.auth.updateUser({
      password: pass1,
      data: { must_change_password: false },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    window.location.hash = '#inicio';
  };

  if (!invitedEmail) {
    return (
      <AuthLayout title="Procesando invitación…">
        <div className="auth-success">Verificando tu enlace de invitación…</div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Bienvenido"
      subtitle={`Crea una contraseña para acceder como ${invitedEmail}.`}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="field">
          <label htmlFor="invite-p1">Nueva contraseña</label>
          <PasswordInput
            id="invite-p1"
            value={pass1}
            onChange={(e) => setPass1(e.target.value)}
            autoComplete="new-password"
            autoFocus
            placeholder="Mínimo 8 caracteres"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="invite-p2">Confirmar contraseña</label>
          <PasswordInput
            id="invite-p2"
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
          {loading ? 'Activando cuenta…' : 'Activar mi cuenta'}
        </button>
      </form>
    </AuthLayout>
  );
}
