import { useState } from 'react';
import { Icon } from '../Icon.jsx';

// Input de password con toggle de visibilidad (eye / eyeOff).
// Mantiene compatibilidad con autoComplete y todas las props nativas de <input>.
export function PasswordInput({ id, value, onChange, autoFocus, autoComplete, placeholder, required }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        autoFocus={autoFocus}
        autoComplete={autoComplete || 'current-password'}
        placeholder={placeholder || '••••••••'}
        required={required}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        tabIndex={-1}
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} size={16} />
      </button>
    </div>
  );
}
