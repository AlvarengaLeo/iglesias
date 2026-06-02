import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { supabase } from '../lib/supabase.js';

// Resuelve el staff interno de EB Connect para el usuario autenticado.
// Si el usuario no tiene fila activa en eb_users → no es staff → sin acceso.
const EbContext = createContext(null);

export function EbProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    if (authLoading) return undefined;
    if (!user) { setStaff(null); setLoading(false); return undefined; }
    setLoading(true);
    supabase
      .from('eb_users')
      .select('id, role, full_name, is_active')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setStaff(data && data.is_active ? data : null);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [user, authLoading]);

  return (
    <EbContext.Provider value={{ staff, role: staff?.role || null, isStaff: !!staff, loading: authLoading || loading }}>
      {children}
    </EbContext.Provider>
  );
}

export function useEb() {
  const ctx = useContext(EbContext);
  if (!ctx) throw new Error('useEb debe usarse dentro de <EbProvider>');
  return ctx;
}
