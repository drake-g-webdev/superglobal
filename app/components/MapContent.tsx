"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Globe from 'react-globe.gl';
import { Globe as GlobeIcon, ArrowLeft, MapPin, Plane, Star, Loader2 } from 'lucide-react';
import { useProfile } from '../context/ProfileContext';
import { useChats } from '../context/ChatsContext';
import { useAuth } from '../context/AuthContext';
import { COUNTRY_COORDINATES } from '../lib/countryCoordinates';
import ProfileDropdown from './ProfileDropdown';
import ProfilePanel from './ProfilePanel';

// Pin types for the globe
type PinType = 'visited' | 'planned' | 'bucket';

interface GlobePin {
  id: string;
  lat: number;
  lng: number;
  name: string;
  type: PinType;
  chatId?: string; // For planned trips
  altitude: number;
  color: string;
}

// Pin colors
const PIN_COLORS = {
  visited: '#22c55e',  // Green
  planned: '#f97316',  // Orange
  bucket: '#a855f7',   // Purple
};

export default function MapContent() {
  const router = useRouter();
  const globeRef = useRef<any>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { chats, createChat, setActiveChat } = useChats();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<GlobePin | null>(null);
  const [globeReady, setGlobeReady] = useState(false);

  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  // Build pins from profile and chats data
  const pins = useMemo((): GlobePin[] => {
    const result: GlobePin[] = [];
    const usedCoordinates = new Set<string>();

    // Helper to get coordinates with slight offset for overlapping pins
    const getCoordinates = (country: string): { lat: number; lng: number } | null => {
      const coords = COUNTRY_COORDINATES[country];
      if (!coords) return null;

      let { lat, lng } = coords;
      const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;

      // Add slight offset for overlapping pins
      if (usedCoordinates.has(key)) {
        lat += (Math.random() - 0.5) * 2;
        lng += (Math.random() - 0.5) * 2;
      }
      usedCoordinates.add(key);

      return { lat, lng };
    };

    // Add visited countries (green pins)
    if (profile.countriesVisited && profile.countriesVisited.length > 0) {
      profile.countriesVisited.forEach((country, index) => {
        const coords = getCoordinates(country);
        if (coords) {
          result.push({
            id: `visited-${index}`,
            lat: coords.lat,
            lng: coords.lng,
            name: country,
            type: 'visited',
            altitude: 0.01,
            color: PIN_COLORS.visited,
          });
        }
      });
    }

    // Add planned trips (orange pins) - only trips that have setup complete
    chats.forEach((chat) => {
      if (chat.tripSetupComplete && chat.destination && chat.destination !== 'General') {
        const coords = getCoordinates(chat.destination);
        if (coords) {
          result.push({
            id: `planned-${chat.id}`,
            lat: coords.lat,
            lng: coords.lng,
            name: chat.destination,
            type: 'planned',
            chatId: chat.id,
            altitude: 0.02,
            color: PIN_COLORS.planned,
          });
        }
      }
    });

    // Add bucket list destinations (purple pins)
    if (profile.bucketList && profile.bucketList.length > 0) {
      profile.bucketList.forEach((country, index) => {
        // Skip if already in planned trips
        const alreadyPlanned = chats.some(
          chat => chat.tripSetupComplete && chat.destination === country
        );
        if (alreadyPlanned) return;

        const coords = getCoordinates(country);
        if (coords) {
          result.push({
            id: `bucket-${index}`,
            lat: coords.lat,
            lng: coords.lng,
            name: country,
            type: 'bucket',
            altitude: 0.015,
            color: PIN_COLORS.bucket,
          });
        }
      });
    }

    return result;
  }, [profile.countriesVisited, profile.bucketList, chats]);

  // Handle pin click
  const handlePinClick = useCallback((pin: GlobePin) => {
    setSelectedPin(pin);

    // Focus globe on the pin
    if (globeRef.current) {
      globeRef.current.pointOfView({
        lat: pin.lat,
        lng: pin.lng,
        altitude: 1.5,
      }, 1000);
    }
  }, []);

  // Handle action button click
  const handleAction = useCallback(() => {
    if (!selectedPin) return;

    if (selectedPin.type === 'planned' && selectedPin.chatId) {
      // Open the planned trip chat
      setActiveChat(selectedPin.chatId);
      router.push('/app');
    } else if (selectedPin.type === 'bucket') {
      // Create a new trip with this destination
      const newChat = createChat(`Trip to ${selectedPin.name}`);
      // The new chat will be active, navigate to app
      router.push('/app');
    }
  }, [selectedPin, setActiveChat, createChat, router]);

  // Set globe options when ready
  useEffect(() => {
    if (globeRef.current && globeReady) {
      // Enable auto-rotation
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.3;

      // Set initial view
      globeRef.current.pointOfView({ altitude: 2.5 }, 0);
    }
  }, [globeReady]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-stone-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col bg-stone-900 text-stone-100">
      {/* Header */}
      <div className="z-20 w-full px-4 py-2 flex items-center justify-between border-b border-stone-800 bg-stone-900/95 backdrop-blur-sm">
        {/* Left side - Back button and logo */}
        <div className="flex items-center gap-4">
          <Link
            href="/app"
            className="flex items-center gap-2 text-stone-400 hover:text-stone-200 transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-stone-400">
            <GlobeIcon size={18} className="text-orange-500" />
            <span className="font-medium text-stone-200">My World Map</span>
          </div>
        </div>

        {/* Right side - Profile dropdown */}
        <ProfileDropdown onOpenProfile={() => setIsProfileOpen(true)} />
      </div>

      {/* Legend */}
      <div className="absolute top-20 left-4 z-10 bg-stone-800/90 backdrop-blur-sm rounded-lg p-4 border border-stone-700">
        <h3 className="text-sm font-medium text-stone-300 mb-3">Legend</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIN_COLORS.visited }} />
            <span className="text-xs text-stone-400">Places Visited ({profile.countriesVisited?.length || 0})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIN_COLORS.planned }} />
            <span className="text-xs text-stone-400">Planned Trips ({chats.filter(c => c.tripSetupComplete && c.destination !== 'General').length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIN_COLORS.bucket }} />
            <span className="text-xs text-stone-400">Dream Destinations ({profile.bucketList?.length || 0})</span>
          </div>
        </div>
      </div>

      {/* Selected Pin Info */}
      {selectedPin && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 bg-stone-800/95 backdrop-blur-sm rounded-xl p-4 border border-stone-700 min-w-[280px] max-w-[400px]">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: selectedPin.color + '20', border: `2px solid ${selectedPin.color}` }}
            >
              {selectedPin.type === 'visited' && <MapPin size={18} style={{ color: selectedPin.color }} />}
              {selectedPin.type === 'planned' && <Plane size={18} style={{ color: selectedPin.color }} />}
              {selectedPin.type === 'bucket' && <Star size={18} style={{ color: selectedPin.color }} />}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-stone-100">{selectedPin.name}</h3>
              <p className="text-sm text-stone-400">
                {selectedPin.type === 'visited' && "You've been here!"}
                {selectedPin.type === 'planned' && "Trip in planning"}
                {selectedPin.type === 'bucket' && "On your bucket list"}
              </p>
            </div>
            <button
              onClick={() => setSelectedPin(null)}
              className="text-stone-500 hover:text-stone-300 transition-colors"
            >
              &times;
            </button>
          </div>

          {/* Action button for planned and bucket list */}
          {(selectedPin.type === 'planned' || selectedPin.type === 'bucket') && (
            <button
              onClick={handleAction}
              className="mt-3 w-full bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {selectedPin.type === 'planned' ? (
                <>
                  <Plane size={16} />
                  Open Trip
                </>
              ) : (
                <>
                  <Star size={16} />
                  Start Planning
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Globe Container */}
      <div className="flex-1 relative">
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          pointsData={pins}
          pointLat="lat"
          pointLng="lng"
          pointAltitude="altitude"
          pointColor="color"
          pointRadius={0.5}
          pointLabel={(d: any) => `
            <div style="background: rgba(41, 37, 36, 0.95); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(120, 113, 108, 0.5);">
              <div style="font-weight: 500; color: white;">${d.name}</div>
              <div style="font-size: 11px; color: #a8a29e; margin-top: 2px;">
                ${d.type === 'visited' ? '✓ Visited' : d.type === 'planned' ? '✈ Planned' : '★ Bucket List'}
              </div>
            </div>
          `}
          onPointClick={(point: any) => handlePinClick(point as GlobePin)}
          onGlobeReady={() => setGlobeReady(true)}
          width={typeof window !== 'undefined' ? window.innerWidth : 1200}
          height={typeof window !== 'undefined' ? window.innerHeight - 60 : 800}
          atmosphereColor="#f97316"
          atmosphereAltitude={0.15}
        />
      </div>

      {/* Profile Panel */}
      <ProfilePanel
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </main>
  );
}
