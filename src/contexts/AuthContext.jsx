import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children, client, signOutScope = 'global' }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  // Flag para distinguir logout manual del usuario vs SIGNED_OUT espurio
  // disparado por clock skew / rate limit / refresh fallido.
  const manualLogoutRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    client.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      // Detectar clock skew: si el JWT exp parece "ya expirado" pero acabamos
      // de obtener una sesión válida, el reloj del cliente está mal sincronizado.
      // Sin esta detección entraríamos en loop de refresh.
      if (data.session) {
        const skew = Math.floor(Date.now() / 1000) - data.session.expires_at;
        if (skew > 60) {
          console.warn(
            `[supabase auth] Clock skew detectado: ${Math.floor(skew / 60)} min. ` +
            `Tu reloj del sistema parece adelantado. ` +
            `Sincroniza la hora del sistema operativo para evitar logouts continuos.`
          );
        }
      }
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = client.auth.onAuthStateChange((event, s) => {
      // Defensa contra logouts espurios cuando el cliente tiene clock skew
      // o cuando Supabase rate-limita el refresh: NO procesamos SIGNED_OUT
      // a menos que el usuario explícitamente hizo signOut() (manualLogoutRef).
      if (event === 'SIGNED_OUT' && !s) {
        if (manualLogoutRef.current) {
          manualLogoutRef.current = false;
          setSession(null);
          return;
        }
        console.warn('[supabase auth] SIGNED_OUT espurio ignorado (no fue acción del usuario). Posiblemente clock skew o rate limit del refresh.');
        // Verificamos storage por si todavía hay sesión utilizable
        client.auth.getSession().then(({ data }) => {
          if (mounted && data.session) setSession(data.session);
        });
        return;
      }
      setSession(s);
    });

    // Cuando vuelves a la pestaña sólo re-sincronizamos lectura del state
    // de Supabase (sin forzar refresh — eso lo hace el autoRefreshToken solo).
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      const { data } = await client.auth.getSession();
      if (mounted && data?.session) setSession(data.session);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [client]);

  const signIn = useCallback(async (email, password) => {
    return client.auth.signInWithPassword({ email, password });
  }, []);

  const signOut = useCallback(async () => {
    // Marcar que ESTE logout es intencional del usuario, para que
    // onAuthStateChange propague el SIGNED_OUT en lugar de filtrarlo.
    manualLogoutRef.current = true;
    return client.auth.signOut({ scope: signOutScope });
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    return client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#reset-password`,
    });
  }, []);

  const updatePassword = useCallback(async (newPassword, clearMustChange = false) => {
    const updates = { password: newPassword };
    if (clearMustChange) {
      updates.data = { must_change_password: false };
    }
    return client.auth.updateUser(updates);
  }, []);

  const user = session?.user ?? null;
  const mustChangePassword = !!user?.user_metadata?.must_change_password;

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        mustChangePassword,
        signIn,
        signOut,
        sendPasswordReset,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
