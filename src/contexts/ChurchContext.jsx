import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from './AuthContext.jsx';

const ChurchContext = createContext(null);

const REST_URL = import.meta.env.VITE_SUPABASE_URL + '/rest/v1';
const APIKEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Direct REST fetch with cache:'no-store' para evitar que el navegador
// devuelva una versión vieja del row tras un update reciente (logo upload, etc.).
// PostgREST no envía Cache-Control y los browsers cachean por heurística →
// stale state después de mutations.
async function fetchMemberships(userId) {
  const { data: sess } = await supabase.auth.getSession();
  const jwt = sess?.session?.access_token;
  if (!jwt) return { data: [], error: null };

  const url = `${REST_URL}/church_users?select=id,church_id,role,person_id,full_name,churches(*)&user_id=eq.${userId}&is_active=eq.true`;
  try {
    const r = await fetch(url, {
      cache: 'no-store',
      headers: {
        apikey: APIKEY,
        Authorization: `Bearer ${jwt}`,
        'X-Client-Info': 'iglesia-crm',
        Accept: 'application/json',
      },
    });
    if (!r.ok) {
      const txt = await r.text();
      return { data: null, error: { message: txt || `HTTP ${r.status}` } };
    }
    const data = await r.json();
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

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
    fetchMemberships(userId).then(({ data, error }) => {
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

  // Sync church object when currentChurchId or memberships change
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

  // Re-fetch memberships + church from Supabase. Used after updateChurch() so
  // sidebar/topbar reflect new values without page reload.
  const refreshChurch = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await fetchMemberships(userId);
    if (error) {
      console.error('refreshChurch error:', error);
      return;
    }
    setMemberships(data || []);
  }, [userId]);

  const currentMembership = memberships.find((m) => m.church_id === currentChurchId);
  const role = currentMembership?.role || null;

  return (
    <ChurchContext.Provider
      value={{
        memberships,
        church,
        churchId: currentChurchId,
        role,
        churchUserId: currentMembership?.id || null,
        personId: currentMembership?.person_id || null,
        loading,
        switchChurch,
        refreshChurch,
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
