import { useEffect, useContext, createContext } from 'react';
import type { User } from '@supabase/supabase-js';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import { supabase } from './supabase';

/**
 * Contexte d'authentification basé sur une petite store Zustand (vanilla).
 * Synchronise l'état avec les événements de Supabase Auth.
 */

interface AuthState {
  user: User | null;
  loading: boolean;
  loaded: boolean;
  setUser: (user: User | null) => void;
  signIn: (email: string, password: string) => Promise<{ error?: string; user?: User }>;
  signOut: () => Promise<void>;
}

export type { AuthState };

export const authStore = createStore<AuthState>((set) => ({
  user: null,
  loading: false,
  loaded: false,
  setUser: (user) => set({ user }),
  signIn: async (email, password) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    set({ loading: false });
    if (error) return { error: error.message };
    const user = data.session?.user ?? null;
    set({ user });
    return user ? { user } : {};
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
}));

export type AuthStore = typeof authStore;

const AuthContext = createContext<AuthStore>(authStore);

/** Provider qui écoute le cycle de vie de la session Supabase. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const store = authStore;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      authStore.setState({ user: data.session?.user ?? null, loading: false, loaded: true });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      authStore.setState({ user: session?.user ?? null, loading: false, loaded: true });
    });

    return () => {
      sub.subscription.unsubscribe();
    };
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