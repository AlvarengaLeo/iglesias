import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from './AuthContext.jsx';

const ChurchContext = createContext(null);

export function ChurchProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  // Estabilizamos la dep usando el id (string), no el objeto user
  // (que cambia de referencia en cada token refresh).
  const userId = user?.id ?? null;

  const [memberships, setMemberships] = useState([]);
  const [currentChurchId, setCurrentChurchId] = useState(null);
  const [church, setChurch] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load memberships when userId changes
  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      setMemberships([]);
      setCurrentChurchId(null);
      setChurch(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    supabase
      .from('church_users')
      .select('church_id, role, full_name, churches(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .then(({ data, error }) => {
        if (error) {
          console.error('church_users fetch error:', error);
          setLoading(false);
          return;
        }
        setMemberships(data || []);
        if (data && data.length > 0) {
          const saved = localStorage.getItem('iglesia-current-church');
          const initial =
            data.find((m) => m.church_id === saved)?.church_id || data[0].church_id;
          setCurrentChurchId(initial);
        }
        setLoading(false);
      });
  }, [userId, authLoading]);

  // Sync church object when currentChurchId changes
  useEffect(() => {
    const m = memberships.find((m) => m.church_id === currentChurchId);
    setChurch(m?.churches || null);
    if (currentChurchId) {
      localStorage.setItem('iglesia-current-church', currentChurchId);
    }
  }, [currentChurchId, memberships]);

  const switchChurch = useCallback((churchId) => {
    setCurrentChurchId(churchId);
  }, []);

  const currentMembership = memberships.find((m) => m.church_id === currentChurchId);
  const role = currentMembership?.role || null;

  return (
    <ChurchContext.Provider
      value={{
        memberships,
        church,
        churchId: currentChurchId,
        role,
        loading,
        switchChurch,
        hasMultipleChurches: memberships.length > 1,
      }}
    >
      {children}
    </ChurchContext.Provider>
  );
}

export function useChurch() {
  const ctx = useContext(ChurchContext);
  if (!ctx) throw new Error('useChurch debe usarse dentro de <ChurchProvider>');
  return ctx;
}
