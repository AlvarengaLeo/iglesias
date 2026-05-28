import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      // SIGNED_OUT que llega durante un TOKEN_REFRESHED fallido es transitorio:
      // si todavía hay sesión válida en storage, no lo propagamos para evitar
      // que el AuthGuard pateé al usuario al login a mitad de navegación.
      if (event === 'SIGNED_OUT' && !s) {
        // Doble check antes de propagar — pregunta una vez más a Supabase.
        supabase.auth.getSession().then(({ data }) => {
          if (mounted) setSession(data.session ?? null);
        });
        return;
      }
      setSession(s);
    });

    // Cuando el usuario vuelve a la pestaña después de dejarla abierta,
    // forzamos refresh para evitar que la próxima query falle por token expirado.
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const { data } = await supabase.auth.refreshSession();
        if (mounted && data?.session) setSession(data.session);
      } catch {
        // Si falla el refresh, dejamos que onAuthStateChange lo maneje
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signOut = useCallback(async () => {
    return supabase.auth.signOut();
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#reset-password`,
    });
  }, []);

  const updatePassword = useCallback(async (newPassword, clearMustChange = false) => {
    const updates = { password: newPassword };
    if (clearMustChange) {
      updates.data = { must_change_password: false };
    }
    return supabase.auth.updateUser(updates);
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
