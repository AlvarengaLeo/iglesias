import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await signIn(email.trim(), password);
    setLoading(false);
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos.' : err.message);
    }
  };

  return (
    <div className="eb-auth">
      <form className="eb-auth-card" onSubmit={submit}>
        <div className="eb-auth-logo"><img src="/apple-touch-icon.png" alt="EB Connect" /></div>
        <div className="eb-auth-brand">EB Connect</div>
        <div className="eb-auth-sub">Backoffice · acceso interno</div>
        <label className="field"><span>Email</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
        </label>
        <label className="field"><span>Contraseña</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div className="eb-auth-error">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
