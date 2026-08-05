/**
 * useAuth.ts
 * Provides the authenticated user, loading state, and a logout helper.
 * Calls GET /api/auth/me on mount — the single source of truth for session state.
 */

import { useState, useEffect, useCallback } from 'react';
import i18n from '../i18n';

const API = import.meta.env.VITE_API_URL ?? '/api';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  avatarUrl?: string | null;
  language?: string | null;
  rank: number;
  totalPoints: number;
  gamesPlayed: number;
  wins: number;
  createdAt: string;
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
          i18n.changeLanguage(data.user.language);
          localStorage.setItem('i18nextLng', data.user.language);
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

  useEffect(() => {
    refresh();
  }, [refresh]);

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
        i18n.changeLanguage(data.user.language);
        localStorage.setItem('i18nextLng', data.user.language);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  }, []);

  return { user, loading, logout, refresh, updateLanguage };
}
