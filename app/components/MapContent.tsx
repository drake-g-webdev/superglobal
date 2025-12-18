"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
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
  chatId?: string;
  color: string;
}

// Pin colors - vibrant and distinct
const PIN_COLORS = {
  visited: '#a855f7',  // Purple - places visited
  planned: '#22c55e',  // Green - trips in planning
  bucket: '#f97316',   // Orange - dream destinations
};

export default function MapContent() {
  const router = useRouter();
  const globeRef = useRef<any>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { chats, createChat, setActiveChat, updateChat } = useChats();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<GlobePin | null>(null);
  const [globeReady, setGlobeReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });

  // Use ref to track rotation state to avoid stale closures
  const isRotatingRef = useRef(true);

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

    const getCoordinates = (country: string): { lat: number; lng: number } | null => {
      const coords = COUNTRY_COORDINATES[country];
      if (!coords) return null;

      let { lat, lng } = coords;
      const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;

      if (usedCoordinates.has(key)) {
        lat += (Math.random() - 0.5) * 3;
        lng += (Math.random() - 0.5) * 3;
      }
      usedCoordinates.add(key);

      return { lat, lng };
    };

    // Visited countries (purple)
    if (profile.countriesVisited?.length) {
      profile.countriesVisited.forEach((country, index) => {
        const coords = getCoordinates(country);
        if (coords) {
          result.push({
            id: `visited-${index}`,
            lat: coords.lat,
            lng: coords.lng,
            name: country,
            type: 'visited',
            color: PIN_COLORS.visited,
          });
        }
      });
    }

    // Planned trips (green)
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
            color: PIN_COLORS.planned,
          });
        }
      }
    });

    // Bucket list (orange)
    if (profile.bucketList?.length) {
      profile.bucketList.forEach((country, index) => {
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
            color: PIN_COLORS.bucket,
          });
        }
      });
    }

    return result;
  }, [profile.countriesVisited, profile.bucketList, chats]);

  // Stop rotation - uses ref to avoid stale closure issues
  const stopRotation = () => {
    if (isRotatingRef.current && globeRef.current) {
      globeRef.current.controls().autoRotate = false;
      isRotatingRef.current = false;
    }
  };

  // Handle pin click - stored in ref so HTML elements can access latest version
  const handlePinClickRef = useRef<(pin: GlobePin) => void>(() => {});
  handlePinClickRef.current = (pin: GlobePin) => {
    stopRotation();
    setSelectedPin(pin);

    if (globeRef.current) {
      globeRef.current.pointOfView({
        lat: pin.lat,
        lng: pin.lng,
        altitude: 1.5,
      }, 1000);
    }
  };

  // Handle action button click
  const handleAction = () => {
    if (!selectedPin) return;

    if (selectedPin.type === 'planned' && selectedPin.chatId) {
      setActiveChat(selectedPin.chatId);
      router.push('/app');
    } else if (selectedPin.type === 'bucket') {
      const newChat = createChat(`Trip to ${selectedPin.name}`);
      updateChat(newChat.id, { destination: selectedPin.name });
      router.push('/app?openSetup=true');
    }
  };

  // Set globe options when ready
  useEffect(() => {
    if (globeRef.current && globeReady) {
      const controls = globeRef.current.controls();

      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
      globeRef.current.pointOfView({ altitude: 1.5 }, 0);

      // Stop rotation on any user interaction with the controls
      const handleInteraction = () => stopRotation();
      controls.addEventListener('start', handleInteraction);

      return () => {
        controls.removeEventListener('start', handleInteraction);
      };
    }
  }, [globeReady]);

  // Create pin HTML element - called by Globe for each pin
  const createPinElement = (d: GlobePin) => {
    const el = document.createElement('div');
    el.style.cssText = `
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      pointer-events: auto;
    `;

    // Simple solid circle with dark outline for visibility
    const inner = document.createElement('div');
    inner.style.cssText = `
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: ${d.color};
      border: 2px solid rgba(0,0,0,0.5);
      box-shadow: 0 0 8px ${d.color}, 0 2px 4px rgba(0,0,0,0.5);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    `;

    el.appendChild(inner);

    // Click handler - use ref to always get latest handler
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handlePinClickRef.current(d);
    });

    // Hover effects
    el.addEventListener('mouseenter', () => {
      inner.style.transform = 'scale(1.4)';
      inner.style.boxShadow = `0 0 16px ${d.color}, 0 4px 8px rgba(0,0,0,0.6)`;
    });
    el.addEventListener('mouseleave', () => {
      inner.style.transform = 'scale(1)';
      inner.style.boxShadow = `0 0 8px ${d.color}, 0 2px 4px rgba(0,0,0,0.5)`;
    });

    return el;
  };

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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col bg-stone-900 text-stone-100">
      {/* Header */}
      <div className="z-20 w-full px-4 py-2 flex items-center justify-between border-b border-stone-800 bg-stone-900/95 backdrop-blur-sm">
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
        <ProfileDropdown onOpenProfile={() => setIsProfileOpen(true)} />
      </div>

      {/* Legend */}
      <div className="absolute top-20 left-4 z-10 bg-stone-800/90 backdrop-blur-sm rounded-lg p-4 border border-stone-700">
        <h3 className="text-sm font-medium text-stone-300 mb-3">Legend</h3>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: PIN_COLORS.visited, boxShadow: `0 0 6px ${PIN_COLORS.visited}` }}
            />
            <span className="text-xs text-stone-400">Places Visited ({profile.countriesVisited?.length || 0})</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: PIN_COLORS.planned, boxShadow: `0 0 6px ${PIN_COLORS.planned}` }}
            />
            <span className="text-xs text-stone-400">Trips in Planning ({chats.filter(c => c.tripSetupComplete && c.destination !== 'General').length})</span>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-3.5 h-3.5 rounded-full"
              style={{ backgroundColor: PIN_COLORS.bucket, boxShadow: `0 0 6px ${PIN_COLORS.bucket}` }}
            />
            <span className="text-xs text-stone-400">Dream Destinations ({profile.bucketList?.length || 0})</span>
          </div>
        </div>
      </div>

      {/* Selected Pin Info */}
      {selectedPin && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 bg-stone-800/95 backdrop-blur-sm rounded-xl p-4 border border-stone-700 min-w-[280px] max-w-[400px] shadow-xl">
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: selectedPin.color, boxShadow: `0 0 12px ${selectedPin.color}` }}
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

          {(selectedPin.type === 'planned' || selectedPin.type === 'bucket') && (
            <button
              onClick={handleAction}
              className="mt-4 w-full text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 hover:brightness-110"
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

      {/* Globe */}
      <div className="flex-1 relative">
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

      <ProfilePanel
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </main>
  );
}
