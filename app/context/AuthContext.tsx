"use client";

import { createContext, useContext, ReactNode } from 'react';
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';
import { Session } from 'next-auth';

interface AuthContextType {
  user: Session['user'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  profileComplete: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  markProfileComplete: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthContextProvider({ children }: { children: ReactNode }) {
  const { data: session, status, update } = useSession();
  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';
  const user = session?.user || null;
  const profileComplete = session?.user?.profileComplete ?? false;

  const login = async (email: string, password: string) => {
    try {
      console.log('[Auth] Attempting login for:', email);
      const result = await signIn('credentials', {
        email,
        password,
        action: 'login',
        redirect: false,
      });

      console.log('[Auth] Login result:', result);

      if (result?.error) {
        console.log('[Auth] Login error:', result.error);
        return { ok: false, error: result.error };
      }

      if (!result?.ok) {
        console.log('[Auth] Login not ok, result:', result);
        return { ok: false, error: 'Login failed' };
      }

      // Force session refresh to ensure isAuthenticated updates before navigation
      console.log('[Auth] Login successful, refreshing session...');
      await update();
      console.log('[Auth] Session refreshed');

      return { ok: true };
    } catch (error) {
      console.error('[Auth] Login exception:', error);
      return { ok: false, error: 'An unexpected error occurred' };
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      console.log('[Auth] Attempting signup for:', email);
      const result = await signIn('credentials', {
        email,
        password,
        name,
        action: 'signup',
        redirect: false,
      });

      console.log('[Auth] Signup result:', result);

      if (result?.error) {
        console.log('[Auth] Signup error:', result.error);
        return { ok: false, error: result.error };
      }

      if (!result?.ok) {
        console.log('[Auth] Signup not ok, result:', result);
        return { ok: false, error: 'Signup failed' };
      }

      // Force session refresh to ensure isAuthenticated updates before navigation
      console.log('[Auth] Signup successful, refreshing session...');
      await update();
      console.log('[Auth] Session refreshed');

      return { ok: true };
    } catch (error) {
      console.error('[Auth] Signup exception:', error);
      return { ok: false, error: 'An unexpected error occurred' };
    }
  };

  const logout = async () => {
    await signOut({ redirect: false });
  };

  const markProfileComplete = async () => {
    await update({ profileComplete: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        profileComplete,
        login,
        signup,
        logout,
        markProfileComplete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextProvider>{children}</AuthContextProvider>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
