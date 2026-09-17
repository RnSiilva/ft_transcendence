/* useAuth.ts
   Central hook managing active user session state.
   Fetches GET /api/auth/me on mount to provide session data across all pages and route guards:
   - user: active user profile data (or null if logged out)
   - loading: true while verifying session on startup (prevents UI flickering)
   - logout: calls backend logout and resets user state to null
   - refresh: re-fetches latest user info and syncs user session
*/

import { useState, useEffect, useCallback } from 'react';
import { disconnectSocket } from '../socket';

const API = import.meta.env.VITE_API_URL ?? '/api';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  avatarUrl?: string | null;
  language?: string | null;
  hasPassword?: boolean;
  rank: number;
  totalPoints: number;
  gamesPlayed: number;
  wins: number;
  createdAt: string;
  achievements?: { achievement?: { nameKey?: string } }[];
}

interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateLanguage: (language: string) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user?.language) {
          localStorage.setItem('lang', data.user.language);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Verificação da sessão ao montar. Feita INLINE (e não via refresh()) para
  // não haver setState síncrono no corpo do efeito: `loading` já começa true,
  // e os setState acontecem só depois do await do fetch. A flag `alive` evita
  // atualizar estado depois de o componente desmontar.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/auth/me`, { credentials: 'include' });
        if (!alive) return;
        if (res.ok) {
          const data = await res.json();
          if (!alive) return;
          setUser(data.user);
          if (data.user?.language) {
            localStorage.setItem('lang', data.user.language);
          }
        } else {
          setUser(null);
        }
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const updateLanguage = useCallback(async (language: string) => {
    const res = await fetch(`${API}/auth/language`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ language }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      if (data.user?.language) {
        localStorage.setItem('lang', data.user.language);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      disconnectSocket();
      setUser(null);
    }
  }, []);

  return { user, loading, logout, refresh, updateLanguage };
}
