"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Map, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl';
import { MapPin, Bed, UtensilsCrossed, Mountain, Landmark, Bus, Trash2, Map as MapIcon, List, Building2, ChevronDown, ChevronRight, Clock, Star, ExternalLink, Route, Loader2, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { useChats, MapPin as MapPinType, MapPinType as PinType, RouteSegment } from '../context/ChatsContext';
import { useTranslations } from '../context/LocaleContext';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// Note: We keep "hostel" and "landmark" for backwards compatibility with old pins
const PIN_COLORS: Record<string, string> = {
  accommodation: '#f97316', // orange
  hostel: '#f97316',        // orange (legacy)
  restaurant: '#ef4444',    // red
  activity: '#22c55e',      // green
  historic: '#a855f7',      // purple
  landmark: '#a855f7',      // purple (legacy)
  transport: '#3b82f6',     // blue
  city: '#f59e0b',          // amber
  other: '#6b7280',         // gray
};

const PIN_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  accommodation: Bed,
  hostel: Bed,              // legacy
  restaurant: UtensilsCrossed,
  activity: Mountain,
  historic: Landmark,
  landmark: Landmark,       // legacy
  transport: Bus,
  city: Building2,
  other: MapPin,
};

// Display labels for the legend and popups
const PIN_LABELS: Record<string, string> = {
  accommodation: 'Accommodation',
  hostel: 'Accommodation',  // legacy
  restaurant: 'Food & Drink',
  activity: 'Activity',
  historic: 'Historic Site',
  landmark: 'Historic Site', // legacy
  transport: 'Transport',
  city: 'City/Town',
  other: 'Other',
};

// Types shown in the legend (excludes legacy types)
const LEGEND_TYPES: PinType[] = ['accommodation', 'restaurant', 'activity', 'historic', 'transport', 'city', 'other'];

// Decode Google's encoded polyline format
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lng / 1e5, lat / 1e5]); // [lng, lat] for Mapbox
  }

  return points;
}

function PinMarker({ pin, onClick, isSelected, isPrimary }: { pin: MapPinType; onClick: () => void; isSelected: boolean; isPrimary?: boolean }) {
  const Icon = PIN_ICONS[pin.type] || MapPin;
  const color = PIN_COLORS[pin.type] || PIN_COLORS.other;
  const size = isPrimary ? 'w-10 h-10' : 'w-8 h-8';
  const iconSize = isPrimary ? 20 : 16;

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
        {/* Itinerary order badge for primary stops */}
        {isPrimary && pin.itineraryOrder !== undefined && (
          <div className="absolute -top-2 -right-2 w-5 h-5 bg-white text-stone-900 rounded-full flex items-center justify-center text-xs font-bold shadow-lg z-10">
            {pin.itineraryOrder + 1}
          </div>
        )}
        <div
          className={clsx(
            size,
            "rounded-full flex items-center justify-center shadow-lg border-2 border-white"
          )}
          style={{ backgroundColor: color }}
        >
          <Icon size={iconSize} className="text-white" />
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

// Itinerary stop item in the list
function ItineraryStopItem({
  pin,
  childPins,
  isExpanded,
  onToggle,
  onSelect,
  isSelected,
  onRemove,
  routeToNext,
  index,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging,
  isDragOver,
}: {
  pin: MapPinType;
  childPins: MapPinType[];
  isExpanded: boolean;
  onToggle: () => void;
  onSelect: (pin: MapPinType) => void;
  isSelected: boolean;
  onRemove: (pinId: string) => void;
  routeToNext?: RouteSegment;
  index: number;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onDrop: (index: number) => void;
  isDragging: boolean;
  isDragOver: boolean;
}) {
  const hasChildren = childPins.length > 0;

  return (
    <div
      className={clsx(
        "border-b border-stone-800 transition-all",
        isDragging && "opacity-50",
        isDragOver && "border-t-2 border-t-orange-500"
      )}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart(index);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver(e, index);
      }}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
    >
      {/* Primary stop header */}
      <div
        className={clsx(
          "flex items-center gap-2 p-3 cursor-pointer transition-colors",
          isSelected ? "bg-stone-700" : "hover:bg-stone-800"
        )}
        onClick={() => onSelect(pin)}
      >
        {/* Drag handle */}
        <div className="cursor-grab active:cursor-grabbing text-stone-500 hover:text-stone-300 -ml-1">
          <GripVertical size={16} />
        </div>

        {/* Expand/collapse button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle();
          }}
          className={clsx(
            "p-0.5 rounded transition-colors",
            hasChildren ? "hover:bg-stone-600 text-stone-400" : "text-transparent cursor-default"
          )}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Order badge */}
        <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {(pin.itineraryOrder ?? 0) + 1}
        </div>

        {/* Pin icon and info */}
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
          <div className="flex items-center gap-2 text-xs text-stone-400">
            {pin.days && <span>{pin.days} days</span>}
            {hasChildren && <span>• {childPins.length} places</span>}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(pin.id);
          }}
          className="p-1.5 hover:bg-stone-600 rounded text-stone-500 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Child pins (expanded) */}
      {isExpanded && hasChildren && (
        <div className="bg-stone-850 border-t border-stone-800">
          {childPins.map((child) => (
            <div
              key={child.id}
              onClick={() => onSelect(child)}
              className="flex items-center gap-2 pl-12 pr-3 py-2 cursor-pointer transition-colors hover:bg-stone-800"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: PIN_COLORS[child.type] }}
              >
                {(() => {
                  const Icon = PIN_ICONS[child.type];
                  return <Icon size={12} className="text-white" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{child.name}</p>
                <p className="text-xs text-stone-500">{PIN_LABELS[child.type]}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(child.id);
                }}
                className="p-1 hover:bg-stone-600 rounded text-stone-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Route info to next stop */}
      {routeToNext && (
        <div className="flex items-center gap-2 px-3 py-2 bg-stone-800/50 text-xs text-stone-400 border-t border-stone-800">
          <Route size={12} className="text-orange-500" />
          <span>{routeToNext.distance.text}</span>
          <span>•</span>
          <Clock size={12} />
          <span>{routeToNext.duration.text}</span>
          <span className="text-stone-500">({routeToNext.mode})</span>
        </div>
      )}
    </div>
  );
}

export default function MapPanel({ isExpanded, onToggle }: MapPanelProps) {
  const { activeChat, removeMapPin, setRouteSegments, reorderItineraryStops } = useChats();
  const t = useTranslations('map');
  const [selectedPin, setSelectedPin] = useState<MapPinType | null>(null);
  const [viewState, setViewState] = useState({
    longitude: 100.5018, // Default: Bangkok
    latitude: 13.7563,
    zoom: 10,
  });
  const [showList, setShowList] = useState(true);
  const [expandedStops, setExpandedStops] = useState<Set<string>>(new Set());
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routeMode, setRouteMode] = useState<'driving' | 'walking' | 'transit'>('driving');

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Update view state when map center changes (from updateMapView calls)
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
  const routeSegments = activeChat?.routeSegments || [];

  // Organize pins: itinerary stops (primary) and their children
  const { itineraryStops, orphanPins, pinsByParent } = useMemo(() => {
    const stops = pins
      .filter(p => p.isItineraryStop)
      .sort((a, b) => (a.itineraryOrder ?? 0) - (b.itineraryOrder ?? 0));

    const byParent: Record<string, MapPinType[]> = {};
    const orphans: MapPinType[] = [];

    pins.forEach(pin => {
      if (pin.isItineraryStop) return;
      if (pin.parentStopId) {
        if (!byParent[pin.parentStopId]) byParent[pin.parentStopId] = [];
        byParent[pin.parentStopId].push(pin);
      } else {
        orphans.push(pin);
      }
    });

    return { itineraryStops: stops, orphanPins: orphans, pinsByParent: byParent };
  }, [pins]);

  // Generate route GeoJSON from route segments
  const routeGeoJson = useMemo(() => {
    if (routeSegments.length === 0) return null;

    const features = routeSegments.map((segment, idx) => {
      const coordinates = decodePolyline(segment.polyline);
      return {
        type: 'Feature' as const,
        properties: {
          segmentIndex: idx,
          mode: segment.mode,
        },
        geometry: {
          type: 'LineString' as const,
          coordinates,
        },
      };
    });

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [routeSegments]);

  // Fetch routes between itinerary stops using Mapbox Directions API
  const fetchRoutes = useCallback(async () => {
    if (!activeChat || itineraryStops.length < 2) {
      console.log('[Routes] Skipping - not enough stops:', itineraryStops.length);
      return;
    }

    console.log('[Routes] Fetching routes for', itineraryStops.length, 'stops');
    setLoadingRoutes(true);
    const segments: RouteSegment[] = [];

    try {
      for (let i = 0; i < itineraryStops.length - 1; i++) {
        const from = itineraryStops[i];
        const to = itineraryStops[i + 1];

        console.log(`[Routes] Fetching route ${i + 1}/${itineraryStops.length - 1}: ${from.name} -> ${to.name}`);

        const response = await fetch('/api/mapbox/directions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: from.coordinates,
            destination: to.coordinates,
            mode: routeMode,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[Routes] Response for ${from.name} -> ${to.name}:`, data.success, data.error || '');
          if (data.success && data.route) {
            segments.push({
              fromPinId: from.id,
              toPinId: to.id,
              distance: data.route.totalDistance,
              duration: data.route.totalDuration,
              polyline: data.route.geometry,
              mode: routeMode,
            });
          }
        } else {
          console.error(`[Routes] Failed to fetch ${from.name} -> ${to.name}:`, response.status);
        }
      }

      console.log('[Routes] Total segments fetched:', segments.length);
      setRouteSegments(activeChat.id, segments);
    } catch (error) {
      console.error('[Routes] Error fetching routes:', error);
    } finally {
      setLoadingRoutes(false);
    }
  }, [activeChat, itineraryStops, routeMode, setRouteSegments]);

  const handleSelectPin = useCallback((pin: MapPinType) => {
    setSelectedPin(pin);
    setViewState(prev => ({
      ...prev,
      longitude: pin.coordinates[0],
      latitude: pin.coordinates[1],
      zoom: 14,
    }));
  }, []);

  const toggleStopExpanded = useCallback((stopId: string) => {
    setExpandedStops(prev => {
      const next = new Set(prev);
      if (next.has(stopId)) {
        next.delete(stopId);
      } else {
        next.add(stopId);
      }
      return next;
    });
  }, []);

  // Drag and drop handlers for itinerary reordering
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  }, [draggedIndex]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((toIndex: number) => {
    if (draggedIndex === null || !activeChat) return;
    if (draggedIndex !== toIndex) {
      reorderItineraryStops(activeChat.id, draggedIndex, toIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, [draggedIndex, activeChat, reorderItineraryStops]);

  // Get route segment for a given stop (route TO the next stop)
  const getRouteAfterStop = useCallback((stopId: string) => {
    return routeSegments.find(s => s.fromPinId === stopId);
  }, [routeSegments]);

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
        <button
          onClick={() => setShowList(!showList)}
          className={clsx(
            "p-1.5 rounded transition-colors flex items-center gap-1 text-xs",
            showList ? "bg-orange-600 text-white" : "hover:bg-stone-700 text-stone-400"
          )}
          title="Toggle pin list"
        >
          <List size={14} />
          {showList ? 'Hide Itinerary' : 'Show Itinerary'}
        </button>
      </div>

      {/* Map with side panel */}
      <div className="flex-1 flex relative">
        {/* Itinerary Panel (slides from left) */}
        <div className={clsx(
          "absolute left-0 top-0 bottom-0 z-10 bg-stone-900/95 backdrop-blur-sm border-r border-stone-700 transition-all duration-300 overflow-hidden",
          showList ? "w-72" : "w-0"
        )}>
          <div className="w-72 h-full flex flex-col">
            <div className="p-3 border-b border-stone-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-stone-300">Trip Itinerary</h3>
                {itineraryStops.length > 0 && (
                  <p className="text-xs text-stone-500">
                    {itineraryStops.length} stops • {itineraryStops.reduce((sum, s) => sum + (s.days || 0), 0)} days
                  </p>
                )}
              </div>
              {/* Generate Route button */}
              {itineraryStops.length >= 2 && (
                <div className="flex items-center gap-2">
                  <select
                    value={routeMode}
                    onChange={(e) => setRouteMode(e.target.value as 'driving' | 'walking' | 'transit')}
                    className="bg-stone-700 border border-stone-600 rounded px-2 py-1.5 text-xs flex-shrink-0"
                  >
                    <option value="driving">Driving</option>
                    <option value="walking">Walking</option>
                    <option value="transit">Transit</option>
                  </select>
                  <button
                    onClick={fetchRoutes}
                    disabled={loadingRoutes}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 transition-colors disabled:opacity-50 text-white text-xs font-medium"
                  >
                    {loadingRoutes ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Route size={14} />
                        Generate Route
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Itinerary stops with nested children */}
              {itineraryStops.map((stop, index) => (
                <ItineraryStopItem
                  key={stop.id}
                  pin={stop}
                  childPins={pinsByParent[stop.id] || []}
                  isExpanded={expandedStops.has(stop.id)}
                  onToggle={() => toggleStopExpanded(stop.id)}
                  onSelect={handleSelectPin}
                  isSelected={selectedPin?.id === stop.id}
                  onRemove={handleRemovePin}
                  routeToNext={getRouteAfterStop(stop.id)}
                  index={index}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDrop={handleDrop}
                  isDragging={draggedIndex === index}
                  isDragOver={dragOverIndex === index}
                />
              ))}

              {/* Orphan pins (not linked to any itinerary stop) */}
              {orphanPins.length > 0 && (
                <>
                  <div className="px-3 py-2 bg-stone-800/50 border-y border-stone-700">
                    <p className="text-xs text-stone-500 font-medium">Other Saved Places</p>
                  </div>
                  {orphanPins.map((pin) => (
                    <div
                      key={pin.id}
                      onClick={() => handleSelectPin(pin)}
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
                        <p className="text-xs text-stone-500">{PIN_LABELS[pin.type] || pin.type}</p>
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
                </>
              )}

              {pins.length === 0 && (
                <div className="p-4 text-center text-stone-500 text-sm">
                  {t('noLocations')}
                </div>
              )}
            </div>
            {/* Legend in panel */}
            <div className="p-3 border-t border-stone-700 bg-stone-800/50">
              <p className="text-xs text-stone-500 mb-2">Legend</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {LEGEND_TYPES.map((type) => {
                  const Icon = PIN_ICONS[type];
                  const color = PIN_COLORS[type];
                  return (
                    <div key={type} className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: color }}
                      >
                        <Icon size={8} className="text-white" />
                      </div>
                      <span className="text-stone-400">{PIN_LABELS[type]}</span>
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

            {/* Route polylines */}
            {routeGeoJson && (
              <Source id="route" type="geojson" data={routeGeoJson}>
                <Layer
                  id="route-line-border"
                  type="line"
                  paint={{
                    'line-color': '#000000',
                    'line-width': 6,
                    'line-opacity': 0.3,
                  }}
                />
                <Layer
                  id="route-line"
                  type="line"
                  paint={{
                    'line-color': '#f97316',
                    'line-width': 4,
                    'line-opacity': 0.8,
                  }}
                />
              </Source>
            )}

            {/* Render itinerary stop pins (larger) */}
            {itineraryStops.map((pin) => (
              <PinMarker
                key={pin.id}
                pin={pin}
                onClick={() => setSelectedPin(pin)}
                isSelected={selectedPin?.id === pin.id}
                isPrimary={true}
              />
            ))}

            {/* Render child pins and orphan pins (smaller) */}
            {[...orphanPins, ...Object.values(pinsByParent).flat()].map((pin) => (
              <PinMarker
                key={pin.id}
                pin={pin}
                onClick={() => setSelectedPin(pin)}
                isSelected={selectedPin?.id === pin.id}
                isPrimary={false}
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
                maxWidth="320px"
              >
                <div className="bg-stone-800 rounded-lg p-3 min-w-52 shadow-xl border border-stone-600">
                  {/* Photo if available */}
                  {selectedPin.placeDetails?.photos?.[0] && (
                    <div className="mb-3 -mx-3 -mt-3">
                      <img
                        src={selectedPin.placeDetails.photos[0].url}
                        alt={selectedPin.name}
                        className="w-full h-32 object-cover rounded-t-lg"
                      />
                    </div>
                  )}

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
                      <p className="text-xs text-stone-400">{PIN_LABELS[selectedPin.type] || selectedPin.type}</p>
                      {selectedPin.isItineraryStop && selectedPin.days && (
                        <p className="text-xs text-orange-400 mt-0.5">{selectedPin.days} days</p>
                      )}
                    </div>
                  </div>

                  {/* Rating */}
                  {selectedPin.placeDetails?.rating && (
                    <div className="flex items-center gap-1 mb-2 text-xs">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-white">{selectedPin.placeDetails.rating}</span>
                      {selectedPin.placeDetails.reviewCount && (
                        <span className="text-stone-400">({selectedPin.placeDetails.reviewCount} reviews)</span>
                      )}
                    </div>
                  )}

                  {/* Address */}
                  {selectedPin.placeDetails?.address && (
                    <p className="text-xs text-stone-400 mb-2">{selectedPin.placeDetails.address}</p>
                  )}

                  {selectedPin.description && (
                    <p className="text-xs text-stone-300 mb-3 leading-relaxed">{selectedPin.description}</p>
                  )}

                  {selectedPin.notes && (
                    <p className="text-xs text-stone-400 italic mb-3">{selectedPin.notes}</p>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {selectedPin.placeDetails?.website && (
                      <a
                        href={selectedPin.placeDetails.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded hover:bg-blue-500/10"
                      >
                        <ExternalLink size={12} />
                        Website
                      </a>
                    )}
                    <button
                      onClick={() => handleRemovePin(selectedPin.id)}
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                    >
                      <Trash2 size={12} />
                      {t('removePin')}
                    </button>
                  </div>
                </div>
              </Popup>
            )}
          </Map>

          {/* No pins message */}
          {pins.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-stone-900/90 rounded-xl p-6 text-center max-w-xs">
                <MapPin size={40} className="mx-auto mb-3 text-orange-500/50" />
                <p className="text-sm text-stone-300 font-medium">{t('noLocations')}</p>
                <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                  {t('addFromChat')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
