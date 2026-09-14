import { useEffect, useContext, createContext } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

/**
 * Contexte d'authentification basé sur une petite store Zustand (vanilla).
 * Synchronise l'état avec la session cookie de notre API (`/api/auth/*`).
 */

/** Forme renvoyée par `/api/auth/*` — mêmes clés que l'ancien `User` Supabase
 * (`user.email`, `user.app_metadata.role`) pour que les autres écrans (ex.
 * AdminLayout.tsx) n'aient pas à changer. */
export interface AppUser {
  id: string;
  email: string;
  app_metadata: { role: string };
}

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  loaded: boolean;
  setUser: (user: AppUser | null) => void;
  signIn: (email: string, password: string) => Promise<{ error?: string; user?: AppUser }>;
  signOut: () => Promise<void>;
}

export type { AuthState };

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export const authStore = createStore<AuthState>((set) => ({
  user: null,
  loading: false,
  loaded: false,
  setUser: (user) => set({ user }),
  signIn: async (email, password) => {
    set({ loading: true });
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: JSON_HEADERS,
      credentials: 'same-origin',
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json().catch(() => ({ error: `Erreur ${res.status}` }));
    set({ loading: false });
    if (!res.ok) return { error: json.error ?? `Erreur ${res.status}` };
    const user = (json.user as AppUser | null) ?? null;
    set({ user });
    return user ? { user } : {};
  },
  signOut: async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    set({ user: null });
  },
}));

export type AuthStore = typeof authStore;

const AuthContext = createContext<AuthStore>(authStore);

/** Provider qui recharge la session au montage (cookie de session déjà posé par le navigateur). */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const store = authStore;

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then((res) => res.json())
      .then((json) => {
        authStore.setState({ user: (json.user as AppUser | null) ?? null, loading: false, loaded: true });
      })
      .catch(() => {
        authStore.setState({ user: null, loading: false, loaded: true });
      });
  }, []);

  return <AuthContext.Provider value={store}>{children}</AuthContext.Provider>;
}

/**
 * Hook d'accès à la store. Sélecteur optionnel : sinon renvoie tout l'état.
 */
export function useAuth<T = AuthState>(selector?: (s: AuthState) => T): T extends undefined ? AuthState : T {
  const store = useContext(AuthContext);
  if (selector) {
    return useStore(store, selector) as T extends undefined ? AuthState : T;
  }
  return useStore(store) as T extends undefined ? AuthState : T;
}
