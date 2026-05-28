import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

// Banner visible cuando se detecta clock skew > 5 minutos. El skew causa
// que el SDK de Supabase considere los tokens como expirados, dispare
// refresh-loops, y termine deslogueando al usuario después de hitar rate limits.
//
// Esto NO se puede arreglar desde código — el usuario debe sincronizar el reloj.
export function ClockSkewBanner() {
  const [skewMinutes, setSkewMinutes] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      const skewSec = Math.floor(Date.now() / 1000) - data.session.expires_at + 3600;
      // expires_at = serverIat + 3600. So serverIat = expires_at - 3600.
      // Real skew = clientNow - serverIat = clientNow - (expires_at - 3600)
      const minutes = Math.round(skewSec / 60);
      setSkewMinutes(Math.abs(minutes) > 5 ? minutes : 0);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!skewMinutes || dismissed) return null;

  const ahead = skewMinutes > 0;
  const absMin = Math.abs(skewMinutes);
  const human = absMin >= 60 ? `${Math.round(absMin / 60)} h` : `${absMin} min`;

  return (
    <div role="alert" style={bannerStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, maxWidth: 1100, margin: '0 auto', padding: '0 20px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>Reloj del sistema desincronizado ({human} {ahead ? 'adelantado' : 'atrasado'}).</strong>{' '}
          Esto causa cierres de sesión repetidos. Sincroniza el reloj de Windows:
          {' '}<em>Configuración → Hora e idioma → Fecha y hora → Sincronizar ahora</em>
          {' '}(o ejecuta <code style={codeStyle}>w32tm /resync</code> en PowerShell admin).
        </div>
        <button
          onClick={() => setDismissed(true)}
          style={dismissStyle}
          aria-label="Ocultar este aviso"
          title="Ocultar (volverá al recargar)"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

const bannerStyle = {
  background: '#C25C5C',
  color: '#fff',
  padding: '10px 0',
  fontSize: 13,
  lineHeight: 1.45,
  position: 'sticky',
  top: 0,
  zIndex: 100,
  boxShadow: '0 2px 8px rgba(194, 92, 92, 0.35)',
};

const codeStyle = {
  background: 'rgba(255,255,255,0.18)',
  padding: '1px 6px',
  borderRadius: 4,
  fontFamily: 'Fira Code, monospace',
  fontSize: 11,
};

const dismissStyle = {
  background: 'rgba(255,255,255,0.18)',
  border: 'none',
  color: '#fff',
  width: 28,
  height: 28,
  borderRadius: 6,
  cursor: 'pointer',
  fontWeight: 700,
  flexShrink: 0,
};
