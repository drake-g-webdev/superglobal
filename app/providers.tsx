'use client';

import { AuthProvider } from './context/AuthContext';
import { ChatsProvider } from './context/ChatsContext';
import { ProfileProvider } from './context/ProfileContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <ChatsProvider>
          {children}
        </ChatsProvider>
      </ProfileProvider>
    </AuthProvider>
  );
}
