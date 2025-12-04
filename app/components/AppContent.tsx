"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ChatInterface from './ChatInterface';
import LanguageSelector from './LanguageSelector';
import ProfileDropdown from './ProfileDropdown';
import ProfilePanel from './ProfilePanel';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AppContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading, profileComplete } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Redirect to login if not authenticated (after loading completes)
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-stone-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render the main app if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between px-2 py-2 bg-stone-900 text-stone-100">
      {/* Header */}
      <div className="z-10 max-w-[1600px] w-full items-center justify-between font-mono text-sm flex">
        {/* Logo/Title - Left side */}
        <p className="flex items-center border-b border-stone-800 bg-stone-900/90 pb-4 pt-4 backdrop-blur-2xl lg:rounded-xl lg:border lg:bg-stone-800/50 lg:p-3">
          superglobal
        </p>

        {/* Right side - Language selector and Profile dropdown */}
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <ProfileDropdown onOpenProfile={() => setIsProfileOpen(true)} />
        </div>
      </div>

      {/* Main content */}
      <div className="relative flex place-items-center w-full max-w-[1600px] flex-1">
        <ChatInterface />
      </div>

      {/* Profile Panel */}
      <ProfilePanel
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </main>
  );
}
