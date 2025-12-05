'use client';

import dynamic from 'next/dynamic';

// Dynamically import AppContent with SSR disabled to avoid AuthProvider issues during build
const AppContent = dynamic(() => import('../components/AppContent'), {
  ssr: false,
});

export default function AppPage() {
  return <AppContent />;
}
