"use client";

import AppContent from './components/AppContent';
import { ProfileProvider } from './context/ProfileContext';
import { ChatsProvider } from './context/ChatsContext';
import { LocaleProvider } from './context/LocaleContext';
import { AuthProvider } from './context/AuthContext';

export default function Home() {
  return (
    <AuthProvider>
      <LocaleProvider>
        <ProfileProvider>
          <ChatsProvider>
            <AppContent />
          </ChatsProvider>
        </ProfileProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}
