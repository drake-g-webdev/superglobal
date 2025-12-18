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
  size: number;
  color: string;
}

// Updated pin colors per user request
const PIN_COLORS = {
  visited: '#a855f7',  // Purple - places visited
  planned: '#22c55e',  // Green - trips in planning
  bucket: '#f97316',   // Orange - dream destinations
};

export default function MapContent() {
  const router = useRouter();
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { chats, createChat, setActiveChat, updateChat } = useChats();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<GlobePin | null>(null);
  const [globeReady, setGlobeReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [isRotating, setIsRotating] = useState(true);

  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  // Handle window resize
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight - 60,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

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
        lat += (Math.random() - 0.5) * 3;
        lng += (Math.random() - 0.5) * 3;
      }
      usedCoordinates.add(key);

      return { lat, lng };
    };

    // Add visited countries (purple pins)
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
            size: 0.8,
            color: PIN_COLORS.visited,
          });
        }
      });
    }

    // Add planned trips (green pins) - only trips that have setup complete
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
            size: 1.0,
            color: PIN_COLORS.planned,
          });
        }
      }
    });

    // Add bucket list destinations (orange pins)
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
            size: 0.9,
            color: PIN_COLORS.bucket,
          });
        }
      });
    }

    return result;
  }, [profile.countriesVisited, profile.bucketList, chats]);

  // Stop rotation when user interacts with globe
  const handleGlobeInteraction = useCallback(() => {
    if (isRotating && globeRef.current) {
      globeRef.current.controls().autoRotate = false;
      setIsRotating(false);
    }
  }, [isRotating]);

  // Handle pin click
  const handlePinClick = useCallback((pin: GlobePin) => {
    handleGlobeInteraction();
    setSelectedPin(pin);

    // Focus globe on the pin
    if (globeRef.current) {
      globeRef.current.pointOfView({
        lat: pin.lat,
        lng: pin.lng,
        altitude: 1.5,
      }, 1000);
    }
  }, [handleGlobeInteraction]);

  // Handle action button click
  const handleAction = useCallback(() => {
    if (!selectedPin) return;

    if (selectedPin.type === 'planned' && selectedPin.chatId) {
      // Open the planned trip chat
      setActiveChat(selectedPin.chatId);
      router.push('/app');
    } else if (selectedPin.type === 'bucket') {
      // Create a new trip with this destination and open the setup wizard
      const newChat = createChat(`Trip to ${selectedPin.name}`);
      // Update the chat with the destination
      updateChat(newChat.id, { destination: selectedPin.name });
      // Navigate to app with query param to open setup wizard
      router.push('/app?openSetup=true');
    }
  }, [selectedPin, setActiveChat, createChat, updateChat, router]);

  // Set globe options when ready
  useEffect(() => {
    if (globeRef.current && globeReady) {
      const controls = globeRef.current.controls();

      // Enable auto-rotation initially
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;

      // Set initial view
      globeRef.current.pointOfView({ altitude: 2.5 }, 0);

      // Stop rotation on any user interaction
      controls.addEventListener('start', handleGlobeInteraction);

      return () => {
        controls.removeEventListener('start', handleGlobeInteraction);
      };
    }
  }, [globeReady, handleGlobeInteraction]);

  // Custom HTML marker for pins - must include click handler in closure
  const createPinElement = useCallback((d: GlobePin) => {
    const el = document.createElement('div');
    el.style.cssText = `
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.2s;
    `;

    // Create inner marker with ring design
    const inner = document.createElement('div');
    inner.style.cssText = `
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: ${d.color};
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4), 0 0 0 2px ${d.color}40;
      transition: transform 0.2s, box-shadow 0.2s;
    `;

    el.appendChild(inner);

    // Click handler - use closure to capture pin data
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      handlePinClick(d);
    });

    // Hover effect
    el.addEventListener('mouseenter', () => {
      inner.style.transform = 'scale(1.3)';
      inner.style.boxShadow = `0 4px 12px rgba(0,0,0,0.5), 0 0 0 4px ${d.color}60`;
    });
    el.addEventListener('mouseleave', () => {
      inner.style.transform = 'scale(1)';
      inner.style.boxShadow = `0 2px 8px rgba(0,0,0,0.4), 0 0 0 2px ${d.color}40`;
    });

    return el;
  }, [handlePinClick]);

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
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: PIN_COLORS.visited, boxShadow: `0 0 0 2px ${PIN_COLORS.visited}40` }} />
            <span className="text-xs text-stone-400">Places Visited ({profile.countriesVisited?.length || 0})</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: PIN_COLORS.planned, boxShadow: `0 0 0 2px ${PIN_COLORS.planned}40` }} />
            <span className="text-xs text-stone-400">Trips in Planning ({chats.filter(c => c.tripSetupComplete && c.destination !== 'General').length})</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: PIN_COLORS.bucket, boxShadow: `0 0 0 2px ${PIN_COLORS.bucket}40` }} />
            <span className="text-xs text-stone-400">Dream Destinations ({profile.bucketList?.length || 0})</span>
          </div>
        </div>
      </div>

      {/* Selected Pin Info */}
      {selectedPin && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 bg-stone-800/95 backdrop-blur-sm rounded-xl p-4 border border-stone-700 min-w-[280px] max-w-[400px] shadow-xl">
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-white"
              style={{ backgroundColor: selectedPin.color, boxShadow: `0 0 0 3px ${selectedPin.color}40` }}
            >
              {selectedPin.type === 'visited' && <MapPin size={20} className="text-white" />}
              {selectedPin.type === 'planned' && <Plane size={20} className="text-white" />}
              {selectedPin.type === 'bucket' && <Star size={20} className="text-white" />}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-stone-100 text-lg">{selectedPin.name}</h3>
              <p className="text-sm text-stone-400">
                {selectedPin.type === 'visited' && "You've been here!"}
                {selectedPin.type === 'planned' && "Trip in planning"}
                {selectedPin.type === 'bucket' && "On your bucket list"}
              </p>
            </div>
            <button
              onClick={() => setSelectedPin(null)}
              className="text-stone-500 hover:text-stone-300 transition-colors text-xl leading-none"
            >
              &times;
            </button>
          </div>

          {/* Action button for planned and bucket list */}
          {(selectedPin.type === 'planned' || selectedPin.type === 'bucket') && (
            <button
              onClick={handleAction}
              className="mt-4 w-full text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              style={{ backgroundColor: selectedPin.color }}
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
      <div ref={containerRef} className="flex-1 relative" onClick={handleGlobeInteraction}>
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          htmlElementsData={pins}
          htmlLat="lat"
          htmlLng="lng"
          htmlElement={(d: any) => createPinElement(d as GlobePin)}
          onGlobeReady={() => setGlobeReady(true)}
          width={dimensions.width}
          height={dimensions.height}
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
