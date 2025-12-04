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
  const profileComplete = (session?.user as any)?.profileComplete ?? false;

  const login = async (email: string, password: string) => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        action: 'login',
        redirect: false,
      });

      if (result?.error) {
        return { ok: false, error: result.error };
      }
      return { ok: true };
    } catch (error) {
      return { ok: false, error: 'An unexpected error occurred' };
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        name,
        action: 'signup',
        redirect: false,
      });

      if (result?.error) {
        return { ok: false, error: result.error };
      }
      return { ok: true };
    } catch (error) {
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
