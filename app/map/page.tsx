'use client';

import dynamic from 'next/dynamic';

// Dynamically import MapContent with SSR disabled (react-globe.gl requires browser environment)
const MapContent = dynamic(() => import('../components/MapContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-stone-400">Loading your world map...</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  return <MapContent />;
}
