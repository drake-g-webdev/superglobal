"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ChatInterface from './ChatInterface';
import ProfileDropdown from './ProfileDropdown';
import ProfilePanel from './ProfilePanel';
import { useAuth } from '../context/AuthContext';
import { Loader2, Globe, Map } from 'lucide-react';

export default function AppContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading, profileComplete } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Redirect to landing page if not authenticated (after loading completes)
  useEffect(() => {
    console.log('[AppContent] Auth state check:', { isLoading, isAuthenticated, profileComplete });
    if (!isLoading && !isAuthenticated) {
      console.log('[AppContent] Not authenticated, redirecting to landing page');
      router.push('/');
    }
  }, [isLoading, isAuthenticated, profileComplete, router]);

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
        {/* Logo/Title - Left side - Links to home */}
        <Link
          href="/"
          className="flex items-center gap-2 border-b border-stone-800 bg-stone-900/90 pb-4 pt-4 backdrop-blur-2xl lg:rounded-xl lg:border lg:bg-stone-800/50 lg:p-3 hover:bg-stone-700/50 transition-colors"
        >
          <Globe size={18} className="text-orange-500" />
          superglobal.travel
        </Link>

        {/* Right side - My Map link and Profile dropdown */}
        <div className="flex items-center gap-3">
          <Link
            href="/map"
            className="flex items-center gap-2 text-stone-400 hover:text-stone-200 transition-colors px-3 py-2 rounded-lg hover:bg-stone-800/50"
          >
            <Map size={18} className="text-orange-500" />
            <span className="hidden sm:inline text-sm">My Map</span>
          </Link>
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

      {/* Footer */}
      <footer className="w-full max-w-[1600px] py-3 text-center text-stone-500 text-xs">
        <p>
          Powered by{' '}
          <a
            href="https://www.thebrokebackpacker.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300"
          >
            The Broke Backpacker
          </a>
        </p>
      </footer>
    </main>
  );
}
