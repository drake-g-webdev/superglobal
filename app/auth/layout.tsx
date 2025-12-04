"use client";

import { AuthProvider } from '../context/AuthContext';
import { LocaleProvider } from '../context/LocaleContext';
import { ProfileProvider } from '../context/ProfileContext';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <LocaleProvider>
        <ProfileProvider>
          {children}
        </ProfileProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}
