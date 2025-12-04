"use client";

import { useState, useCallback, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import { MapPin, Bed, UtensilsCrossed, Mountain, Landmark, Bus, X, Trash2, Map as MapIcon, List } from 'lucide-react';
import clsx from 'clsx';
import { useChats, MapPin as MapPinType, MapPinType as PinType } from '../context/ChatsContext';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

const PIN_COLORS: Record<PinType, string> = {
  hostel: '#f97316',     // orange
  restaurant: '#ef4444', // red
  activity: '#22c55e',   // green
  landmark: '#a855f7',   // purple
  transport: '#3b82f6',  // blue
  other: '#6b7280',      // gray
};

const PIN_ICONS: Record<PinType, React.ComponentType<{ size?: number; className?: string }>> = {
  hostel: Bed,
  restaurant: UtensilsCrossed,
  activity: Mountain,
  landmark: Landmark,
  transport: Bus,
  other: MapPin,
};

function PinMarker({ pin, onClick, isSelected }: { pin: MapPinType; onClick: () => void; isSelected: boolean }) {
  const Icon = PIN_ICONS[pin.type] || MapPin;
  const color = PIN_COLORS[pin.type] || PIN_COLORS.other;

  return (
    <Marker
      longitude={pin.coordinates[0]}
      latitude={pin.coordinates[1]}
      anchor="bottom"
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick();
      }}
    >
      <div
        className={clsx(
          "relative cursor-pointer transition-transform",
          isSelected && "scale-125 z-10"
        )}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
          style={{ backgroundColor: color }}
        >
          <Icon size={16} className="text-white" />
        </div>
        {/* Pin point */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-0 h-0"
          style={{
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: `8px solid ${color}`,
          }}
        />
      </div>
    </Marker>
  );
}

export default function MapPanel({ isExpanded, onToggle }: MapPanelProps) {
  const { activeChat, removeMapPin, updateMapView } = useChats();
  const [selectedPin, setSelectedPin] = useState<MapPinType | null>(null);
  const [viewState, setViewState] = useState({
    longitude: 100.5018, // Default: Bangkok
    latitude: 13.7563,
    zoom: 10,
  });
  const [showList, setShowList] = useState(false);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Update view state when map center changes (from updateMapView calls)
  // This is the primary way to center the map on a specific location
  useEffect(() => {
    if (activeChat?.mapCenter) {
      setViewState({
        longitude: activeChat.mapCenter[0],
        latitude: activeChat.mapCenter[1],
        zoom: activeChat.mapZoom || 14,
      });
    }
  }, [activeChat?.mapCenter, activeChat?.mapZoom]);

  const handleMapClick = useCallback(() => {
    setSelectedPin(null);
  }, []);

  const handleRemovePin = useCallback((pinId: string) => {
    if (activeChat) {
      removeMapPin(activeChat.id, pinId);
      setSelectedPin(null);
    }
  }, [activeChat, removeMapPin]);

  const pins = activeChat?.mapPins || [];

  if (!mapboxToken) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-800 rounded-lg p-4">
        <div className="text-center text-stone-400">
          <MapIcon size={48} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">Map not configured</p>
          <p className="text-xs mt-1">Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-stone-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-stone-700 bg-stone-800">
        <div className="flex items-center gap-2">
          <MapIcon size={16} className="text-orange-500" />
          <span className="text-sm font-medium">Trip Map</span>
          {pins.length > 0 && (
            <span className="bg-orange-600 text-white text-xs px-1.5 py-0.5 rounded-full">
              {pins.length} {pins.length === 1 ? 'pin' : 'pins'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowList(!showList)}
            className={clsx(
              "p-1.5 rounded transition-colors flex items-center gap-1 text-xs",
              showList ? "bg-orange-600 text-white" : "hover:bg-stone-700 text-stone-400"
            )}
            title="Toggle pin list"
          >
            <List size={14} />
            {showList ? 'Hide List' : 'Show List'}
          </button>
        </div>
      </div>

      {/* Map with side panel */}
      <div className="flex-1 flex relative">
        {/* Pin List Panel (slides from left) */}
        <div className={clsx(
          "absolute left-0 top-0 bottom-0 z-10 bg-stone-900/95 backdrop-blur-sm border-r border-stone-700 transition-all duration-300 overflow-hidden",
          showList ? "w-64" : "w-0"
        )}>
          <div className="w-64 h-full flex flex-col">
            <div className="p-3 border-b border-stone-700">
              <h3 className="text-sm font-medium text-stone-300">Saved Locations</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {pins.map((pin) => (
                <div
                  key={pin.id}
                  onClick={() => {
                    setSelectedPin(pin);
                    setViewState({
                      ...viewState,
                      longitude: pin.coordinates[0],
                      latitude: pin.coordinates[1],
                      zoom: 14,
                    });
                  }}
                  className={clsx(
                    "flex items-center gap-3 p-3 cursor-pointer border-b border-stone-800 transition-colors",
                    selectedPin?.id === pin.id ? "bg-stone-700" : "hover:bg-stone-800"
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: PIN_COLORS[pin.type] }}
                  >
                    {(() => {
                      const Icon = PIN_ICONS[pin.type];
                      return <Icon size={14} className="text-white" />;
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pin.name}</p>
                    <p className="text-xs text-stone-500 capitalize">{pin.type}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePin(pin.id);
                    }}
                    className="p-1.5 hover:bg-stone-600 rounded text-stone-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {pins.length === 0 && (
                <div className="p-4 text-center text-stone-500 text-sm">
                  No locations saved yet
                </div>
              )}
            </div>
            {/* Legend in panel */}
            <div className="p-3 border-t border-stone-700 bg-stone-800/50">
              <p className="text-xs text-stone-500 mb-2">Legend</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {(Object.entries(PIN_COLORS) as [PinType, string][]).map(([type, color]) => {
                  const Icon = PIN_ICONS[type];
                  return (
                    <div key={type} className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: color }}
                      >
                        <Icon size={8} className="text-white" />
                      </div>
                      <span className="text-stone-400 capitalize">{type}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <Map
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            onClick={handleMapClick}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            mapboxAccessToken={mapboxToken}
            style={{ width: '100%', height: '100%' }}
          >
            <NavigationControl position="top-right" />

            {pins.map((pin) => (
              <PinMarker
                key={pin.id}
                pin={pin}
                onClick={() => setSelectedPin(pin)}
                isSelected={selectedPin?.id === pin.id}
              />
            ))}

            {selectedPin && (
              <Popup
                longitude={selectedPin.coordinates[0]}
                latitude={selectedPin.coordinates[1]}
                anchor="bottom"
                offset={[0, -40]}
                onClose={() => setSelectedPin(null)}
                closeOnClick={false}
                className="map-popup"
              >
                <div className="bg-stone-800 rounded-lg p-3 min-w-52 shadow-xl border border-stone-600">
                  <div className="flex items-start gap-2 mb-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: PIN_COLORS[selectedPin.type] }}
                    >
                      {(() => {
                        const Icon = PIN_ICONS[selectedPin.type];
                        return <Icon size={14} className="text-white" />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white text-sm">{selectedPin.name}</h4>
                      <p className="text-xs text-stone-400 capitalize">{selectedPin.type}</p>
                    </div>
                  </div>
                  {selectedPin.description && (
                    <p className="text-xs text-stone-300 mb-3 leading-relaxed">{selectedPin.description}</p>
                  )}
                  <button
                    onClick={() => handleRemovePin(selectedPin.id)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                  >
                    <Trash2 size={12} />
                    Remove from map
                  </button>
                </div>
              </Popup>
            )}
          </Map>

          {/* No pins message */}
          {pins.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-stone-900/90 rounded-xl p-6 text-center max-w-xs">
                <MapPin size={40} className="mx-auto mb-3 text-orange-500/50" />
                <p className="text-sm text-stone-300 font-medium">No locations yet</p>
                <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                  Ask Will for recommendations and click "Add to Map" to start building your trip map
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
