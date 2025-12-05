'use client';

import { AuthProvider } from './context/AuthContext';
import { ChatsProvider } from './context/ChatsContext';
import { ProfileProvider } from './context/ProfileContext';
import { LocaleProvider } from './context/LocaleContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocaleProvider>
      <AuthProvider>
        <ProfileProvider>
          <ChatsProvider>
            {children}
          </ChatsProvider>
        </ProfileProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
