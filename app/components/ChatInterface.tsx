"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, MapPin, DollarSign, User, Settings, Compass, Calendar, Target, Map as MapIcon, Plus, Check, Loader2, MessageSquare, ChevronLeft, ChevronRight, Calculator, ListChecks, Backpack, CalendarDays, Mountain, Sailboat, Tent, Footprints, X, Menu, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import clsx from 'clsx';
import { useChats, MapPinType, ExtractedLocation, MessageLocations, ExtractedCost, MessageCosts, CostCategory, ExtractedItinerary, MessageItineraries, ItineraryStop, PlaceDetails } from '../context/ChatsContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslations } from '../context/LocaleContext';
import ChatSidebar from './ChatSidebar';
import ProfilePanel from './ProfilePanel';
import TripSetupWizard from './TripSetupWizard';
import MapPanel from './MapPanel';
import CostDashboard from './CostDashboard';
import BucketListPanel from './BucketListPanel';
import PackingListPanel from './PackingListPanel';
import EventsPanel from './EventsPanel';
import BudgetReviewPanel from './BudgetReviewPanel';
import { API_URL } from '../config/api';

// Adventure-themed thinking messages with icons
const THINKING_MESSAGES = [
    { text: "Trekking through the jungle...", Icon: Footprints },
    { text: "Scaling mountain peaks...", Icon: Mountain },
    { text: "Sailing uncharted waters...", Icon: Sailboat },
    { text: "Setting up camp...", Icon: Tent },
    { text: "Following ancient trails...", Icon: Compass },
    { text: "Exploring off the beaten path...", Icon: MapIcon },
];

// Thinking animation component
function ThinkingAnimation() {
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % THINKING_MESSAGES.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const currentMessage = THINKING_MESSAGES[messageIndex];
    const IconComponent = currentMessage.Icon;

    return (
        <div className="flex items-center gap-3">
            <motion.div
                key={messageIndex}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-shrink-0"
            >
                <motion.div
                    animate={{
                        y: [0, -4, 0],
                        rotate: [0, 5, -5, 0]
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    <IconComponent size={20} className="text-orange-400" />
                </motion.div>
            </motion.div>
            <AnimatePresence mode="wait">
                <motion.span
                    key={messageIndex}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.3 }}
                    className="text-stone-400 text-sm italic"
                >
                    {currentMessage.text}
                </motion.span>
            </AnimatePresence>
        </div>
    );
}

export default function ChatInterface() {
    const { activeChat, updateChat, addMessage, addMapPin, removeMapPin, addTouristTrap, updateMapView, mergeConversationVariables, setExtractedLocations, setExtractedCosts, setExtractedItinerary, addCostItem, updateTripContext } = useChats();
    const { profile, isProfileSet } = useProfile();
    const t = useTranslations('chat');
    const tProfile = useTranslations('profile');
    const tTripSetup = useTranslations('tripSetup');
    const tMap = useTranslations('map');
    const tCosts = useTranslations('costs');
    const tBucket = useTranslations('bucketList');
    const tPacking = useTranslations('packingList');
    const tEvents = useTranslations('events');

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isTripSetupOpen, setIsTripSetupOpen] = useState(false);
    const [isMapExpanded, setIsMapExpanded] = useState(true);
    const [rightPanelTab, setRightPanelTab] = useState<'map' | 'costs' | 'bucket' | 'packing' | 'events'>('map');
    const [showTripContext, setShowTripContext] = useState(false);

    // Mobile-specific state
    const [mobilePanel, setMobilePanel] = useState<'chat' | 'map' | 'costs' | 'bucket' | 'packing' | 'events' | null>(null);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [addingLocation, setAddingLocation] = useState<string | null>(null);
    const [addedLocations, setAddedLocations] = useState<Set<string>>(new Set());

    // Track in-flight location extraction requests
    const [extractingLocations, setExtractingLocations] = useState<Set<string>>(new Set()); // keyed by "chatId-msgIdx"

    // Global ref to track in-flight requests - never reset
    const inFlightRef = useRef<Set<string>>(new Set());

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get locations for current chat from persisted context (survives refresh)
    const messageLocations = activeChat?.extractedLocations || {};

    // Get costs for current chat from persisted context (survives refresh)
    const messageCosts = activeChat?.extractedCosts || {};

    // Track in-flight cost extraction requests
    const [extractingCosts, setExtractingCosts] = useState<Set<string>>(new Set());
    const costInFlightRef = useRef<Set<string>>(new Set());

    // Track in-flight itinerary extraction requests
    const [extractingItinerary, setExtractingItinerary] = useState<Set<string>>(new Set());
    const itineraryInFlightRef = useRef<Set<string>>(new Set());

    // Track if we've added an itinerary to the trip (to show "Added" state)
    const [addedItineraryFromMessage, setAddedItineraryFromMessage] = useState<number | null>(null);

    // Track which costs have been added to budget (by name to avoid duplicates)
    const [addedCosts, setAddedCosts] = useState<Set<string>>(new Set());

    // Modal state for editing cost before adding to budget
    const [editingCost, setEditingCost] = useState<ExtractedCost | null>(null);
    const [editingCostMessageIndex, setEditingCostMessageIndex] = useState<number | null>(null);

    // Update added locations when chat changes or pins change
    useEffect(() => {
        if (activeChat) {
            const pinned = new Set(activeChat.mapPins.map(p => p.name.toLowerCase()));
            setAddedLocations(pinned);
        }
    }, [activeChat?.id, activeChat?.mapPins]);

    // Update added costs when chat changes or cost items change
    useEffect(() => {
        if (activeChat) {
            const budgeted = new Set(activeChat.tripCosts.items.map(c => c.name.toLowerCase()));
            setAddedCosts(budgeted);
        }
    }, [activeChat?.id, activeChat?.tripCosts.items]);

    // Reset itinerary "added" state when switching chats (so new chat doesn't show "Added" from another chat)
    useEffect(() => {
        setAddedItineraryFromMessage(null);
    }, [activeChat?.id]);

    // Extract locations from a message using AI
    const extractLocationsFromMessage = useCallback(async (messageContent: string, messageIndex: number, chatId: string, destination: string) => {
        const key = `${chatId}-${messageIndex}`;
        console.log('[Location Extraction] Starting extraction for key:', key);

        // Check if already in flight or already extracted
        if (inFlightRef.current.has(key)) {
            console.log('[Location Extraction] Already in-flight, skipping:', key);
            return;
        }

        // Mark as in-flight immediately
        inFlightRef.current.add(key);
        setExtractingLocations(prev => new Set([...prev, key]));

        try {
            console.log('[Location Extraction] Calling API for:', destination);
            const response = await fetch(`${API_URL}/api/extract-locations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    response_text: messageContent,
                    destination: destination,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[Location Extraction] API Response:', data);
                const typedLocations: ExtractedLocation[] = (data.locations || []).map((loc: { name: string; type: string; description: string; area: string }) => ({
                    name: loc.name,
                    type: (loc.type as MapPinType) || 'other',
                    description: loc.description || '',
                    area: loc.area || '',
                }));

                console.log('[Location Extraction] Extracted locations:', typedLocations.length, 'locations for message', messageIndex);
                // Persist to context (survives refresh via localStorage)
                setExtractedLocations(chatId, messageIndex, typedLocations);
            } else {
                console.error('[Location Extraction] API error:', response.status, response.statusText);
            }
        } catch (e) {
            console.error('[Location Extraction] Failed:', e);
            // Remove from in-flight on error so it can be retried
            inFlightRef.current.delete(key);
        } finally {
            setExtractingLocations(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    }, [setExtractedLocations]);

    // Extract costs from a message using AI
    const extractCostsFromMessage = useCallback(async (messageContent: string, messageIndex: number, chatId: string, destination: string, tripDays: number = 0) => {
        const key = `costs-${chatId}-${messageIndex}`;
        console.log('[Cost Extraction] Starting extraction for key:', key);

        // Check if already in flight or already extracted
        if (costInFlightRef.current.has(key)) {
            console.log('[Cost Extraction] Already in-flight, skipping:', key);
            return;
        }

        // Mark as in-flight immediately
        costInFlightRef.current.add(key);
        setExtractingCosts(prev => new Set([...prev, key]));

        try {
            console.log('[Cost Extraction] Calling API for:', destination, 'trip_days:', tripDays);
            const response = await fetch(`${API_URL}/api/extract-costs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    response_text: messageContent,
                    destination: destination,
                    num_travelers: 1,
                    trip_days: tripDays,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[Cost Extraction] API Response:', data);
                const typedCosts: ExtractedCost[] = (data.costs || []).map((cost: { name: string; category: string; amount: number; quantity: number; unit: string; notes: string; text_to_match?: string; is_range?: boolean }) => ({
                    name: cost.name,
                    category: (cost.category as CostCategory) || 'misc',
                    amount: cost.amount || 0,
                    quantity: cost.quantity || 1,
                    unit: cost.unit || 'trip',
                    notes: cost.notes || '',
                    text_to_match: cost.text_to_match || '',
                    is_range: cost.is_range || false,
                }));

                console.log('[Cost Extraction] Extracted costs:', typedCosts.length, 'costs for message', messageIndex);
                // Persist to context (survives refresh via localStorage)
                setExtractedCosts(chatId, messageIndex, typedCosts);
            } else {
                console.error('[Cost Extraction] API error:', response.status, response.statusText);
            }
        } catch (e) {
            console.error('[Cost Extraction] Failed:', e);
            // Remove from in-flight on error so it can be retried
            costInFlightRef.current.delete(key);
        } finally {
            setExtractingCosts(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    }, [setExtractedCosts]);

    // Extract conversation variables from a message exchange
    const extractConversationVariables = useCallback(async (userMessage: string, aiResponse: string, chatId: string, destination: string) => {
        console.log('[ConvVars Extraction] Starting extraction');

        try {
            const response = await fetch(`${API_URL}/api/extract-conversation-vars`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_message: userMessage,
                    ai_response: aiResponse,
                    destination: destination,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[ConvVars Extraction] API Response:', data);

                if (data.has_new_info && data.variables) {
                    // Convert snake_case to camelCase for frontend
                    const vars = data.variables;
                    mergeConversationVariables(chatId, {
                        placesDiscussed: vars.places_discussed || [],
                        placesToAvoid: vars.places_to_avoid || [],
                        activityPreferences: vars.activity_preferences || [],
                        foodPreferences: vars.food_preferences || [],
                        accommodationNotes: vars.accommodation_notes || [],
                        travelCompanions: vars.travel_companions || '',
                        pacePreference: vars.pace_preference || '',
                        mustDoActivities: vars.must_do_activities || [],
                        concerns: vars.concerns || [],
                        budgetNotes: vars.budget_notes || [],
                        customNotes: vars.custom_notes || {},
                    });
                    console.log('[ConvVars Extraction] Merged new conversation variables');
                }
            } else {
                console.error('[ConvVars Extraction] API error:', response.status, response.statusText);
            }
        } catch (e) {
            console.error('[ConvVars Extraction] Failed:', e);
        }
    }, [mergeConversationVariables]);

    // Extract itinerary from a message using AI
    const extractItineraryFromMessage = useCallback(async (messageContent: string, messageIndex: number, chatId: string, destination: string) => {
        const key = `itinerary-${chatId}-${messageIndex}`;
        console.log('[Itinerary Extraction] Starting extraction for key:', key);

        // Check if already in flight
        if (itineraryInFlightRef.current.has(key)) {
            console.log('[Itinerary Extraction] Already in-flight, skipping:', key);
            return;
        }

        // Mark as in-flight immediately
        itineraryInFlightRef.current.add(key);
        setExtractingItinerary(prev => new Set([...prev, key]));

        try {
            console.log('[Itinerary Extraction] Calling API for:', destination);
            const response = await fetch(`${API_URL}/api/extract-itinerary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    response_text: messageContent,
                    destination: destination,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[Itinerary Extraction] API Response:', data);

                if (data.has_itinerary && data.itinerary && data.itinerary.length >= 2) {
                    const extractedItinerary: ExtractedItinerary = {
                        stops: data.itinerary.map((stop: { location: string; days: number; notes?: string; order: number }) => ({
                            location: stop.location,
                            days: stop.days,
                            notes: stop.notes || '',
                        })),
                        totalDays: data.total_days,
                        hasItinerary: true,
                    };

                    console.log('[Itinerary Extraction] Extracted itinerary:', extractedItinerary.stops.length, 'stops,', extractedItinerary.totalDays, 'days');
                    setExtractedItinerary(chatId, messageIndex, extractedItinerary);
                }
            } else {
                console.error('[Itinerary Extraction] API error:', response.status, response.statusText);
            }
        } catch (e) {
            console.error('[Itinerary Extraction] Failed:', e);
            itineraryInFlightRef.current.delete(key);
        } finally {
            setExtractingItinerary(prev => {
                const next = new Set(prev);
                next.delete(key);
                return next;
            });
        }
    }, [setExtractedItinerary]);

    // Helper to try geocoding with multiple query variations
    const tryGeocode = useCallback(async (location: string, destination: string): Promise<[number, number] | null> => {
        // List of query variations to try
        const variations = [
            { place: location, context: destination },
            { place: `${location}, ${destination}`, context: destination },
            { place: location.replace(/\s+(Valley|Region|Area|District|Province)$/i, ''), context: destination },
            { place: `${location} city`, context: destination },
        ];

        for (const query of variations) {
            try {
                const response = await fetch(`${API_URL}/api/geocode`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        place_name: query.place,
                        context: query.context,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.coordinates) {
                        console.log('[Geocode] Success with query:', query.place);
                        return data.coordinates as [number, number];
                    }
                }
            } catch (e) {
                console.warn('[Geocode] Failed attempt:', query.place, e);
            }
        }
        return null;
    }, []);

    // Add extracted itinerary to trip context and map
    const addItineraryToTrip = useCallback(async (messageIndex: number) => {
        if (!activeChat) return;

        const extractedItinerary = activeChat.extractedItineraries?.[messageIndex];
        if (!extractedItinerary || !extractedItinerary.hasItinerary) return;

        // Clear existing itinerary pins first
        const existingItineraryPins = activeChat.mapPins.filter(p => p.isItineraryStop);
        for (const pin of existingItineraryPins) {
            removeMapPin(activeChat.id, pin.id);
        }

        // Update trip context with the new itinerary
        updateTripContext(activeChat.id, {
            itineraryBreakdown: extractedItinerary.stops,
            tripDurationDays: extractedItinerary.totalDays,
        });

        setAddedItineraryFromMessage(messageIndex);
        console.log('[Add Itinerary] Adding', extractedItinerary.stops.length, 'stops to trip');

        // Also add each stop to the map as a city pin with itinerary metadata
        // Note: We do NOT filter by name because itineraries can have the same city multiple times
        // (e.g., starting and ending in the same city)
        const destination = activeChat.destination || 'World';
        let firstCoords: [number, number] | null = null;
        const failedStops: { stop: typeof extractedItinerary.stops[0]; index: number }[] = [];
        // Cache geocoded coordinates by name to avoid redundant API calls for same location
        const geocodeCache: Record<string, [number, number]> = {};

        // First pass: try to geocode all stops
        for (let i = 0; i < extractedItinerary.stops.length; i++) {
            const stop = extractedItinerary.stops[i];
            const nameLower = stop.location.toLowerCase();

            // Check cache first - if we've already geocoded this location, reuse coords
            let coords: [number, number] | null = geocodeCache[nameLower] || null;
            if (!coords) {
                coords = await tryGeocode(stop.location, destination);
                if (coords) {
                    geocodeCache[nameLower] = coords;
                }
            }

            if (coords) {
                addMapPin(activeChat.id, {
                    name: stop.location,
                    type: 'city',
                    description: stop.notes || `${stop.days} days`,
                    coordinates: coords,
                    sourceMessageIndex: messageIndex,
                    isItineraryStop: true,
                    itineraryOrder: i,
                    days: stop.days,
                    notes: stop.notes,
                });
                console.log('[Add Itinerary] Added to map:', stop.location, 'at order', i, coords);

                if (!firstCoords) {
                    firstCoords = coords;
                }
            } else {
                console.warn('[Add Itinerary] First pass failed for:', stop.location);
                failedStops.push({ stop, index: i });
            }
        }

        // Second pass: retry failed stops with more aggressive variations
        if (failedStops.length > 0) {
            console.log('[Add Itinerary] Retrying', failedStops.length, 'failed stops');

            for (const { stop, index } of failedStops) {
                // Try with just the first word (often the main city name)
                const firstWord = stop.location.split(/[\s,\-\/]+/)[0];
                const words = stop.location.split(/[\s,\-\/]+/);

                const retryQueries = [
                    `${stop.location} ${destination}`,
                    firstWord.length > 3 ? firstWord : stop.location,
                    words.length > 1 ? words.slice(0, 2).join(' ') : stop.location,
                ];

                let found = false;
                for (const query of retryQueries) {
                    try {
                        const response = await fetch(`${API_URL}/api/geocode`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                place_name: query,
                                context: destination,
                            }),
                        });

                        if (response.ok) {
                            const data = await response.json();
                            if (data.success && data.coordinates) {
                                const coords = data.coordinates as [number, number];
                                addMapPin(activeChat.id, {
                                    name: stop.location,
                                    type: 'city',
                                    description: stop.notes || `${stop.days} days`,
                                    coordinates: coords,
                                    sourceMessageIndex: messageIndex,
                                    isItineraryStop: true,
                                    itineraryOrder: index,
                                    days: stop.days,
                                    notes: stop.notes,
                                });
                                console.log('[Add Itinerary] Retry success for:', stop.location, 'using query:', query);

                                if (!firstCoords) {
                                    firstCoords = coords;
                                }
                                found = true;
                                break;
                            }
                        }
                    } catch (e) {
                        console.warn('[Add Itinerary] Retry failed:', query, e);
                    }
                }

                if (!found) {
                    console.error('[Add Itinerary] Could not geocode after retries:', stop.location);
                }
            }
        }

        // Center map on first stop if we added any
        if (firstCoords) {
            updateMapView(activeChat.id, firstCoords, 6); // Zoom out to see the route
        }

        console.log('[Add Itinerary] Complete. Total stops:', extractedItinerary.stops.length, 'Failed:', failedStops.length);
    }, [activeChat, updateTripContext, addMapPin, removeMapPin, updateMapView, tryGeocode]);

    // No auto-extraction effect - we trigger extraction directly after receiving a response

    // Function to add a single location to the map
    // Helper to calculate distance between two coordinates (Haversine formula)
    const getDistanceKm = (coord1: [number, number], coord2: [number, number]): number => {
        const R = 6371; // Earth's radius in km
        const dLat = (coord2[1] - coord1[1]) * Math.PI / 180;
        const dLon = (coord2[0] - coord1[0]) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(coord1[1] * Math.PI / 180) * Math.cos(coord2[1] * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Find the nearest itinerary stop to a given coordinate (within 100km threshold)
    const findNearestItineraryStop = useCallback((coords: [number, number]): string | undefined => {
        if (!activeChat) return undefined;
        const itineraryStops = activeChat.mapPins.filter(p => p.isItineraryStop);
        if (itineraryStops.length === 0) return undefined;

        let nearestStop: typeof itineraryStops[0] | null = null;
        let minDistance = Infinity;
        const THRESHOLD_KM = 100; // Max distance to link to a stop

        for (const stop of itineraryStops) {
            const distance = getDistanceKm(coords, stop.coordinates);
            if (distance < minDistance && distance < THRESHOLD_KM) {
                minDistance = distance;
                nearestStop = stop;
            }
        }

        return nearestStop?.id;
    }, [activeChat]);

    const addLocationToMap = useCallback(async (location: ExtractedLocation, messageIndex: number) => {
        console.log('[Add to Map] Clicked for:', location.name, 'type:', location.type);
        if (!activeChat) {
            console.log('[Add to Map] No active chat');
            return;
        }
        if (addedLocations.has(location.name.toLowerCase())) {
            console.log('[Add to Map] Already added:', location.name);
            return;
        }

        setAddingLocation(location.name);
        try {
            // Use the location's specific area for geocoding context, combined with the trip destination
            // e.g., "Cotopaxi, Ecuador" instead of just "Ecuador"
            const geocodeContext = location.area
                ? `${location.area}, ${activeChat.destination}`
                : activeChat.destination;
            console.log('[Add to Map] Geocoding:', location.name, 'in context:', geocodeContext, '(area:', location.area, ')');
            const geocodeResponse = await fetch(`${API_URL}/api/geocode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    place_name: location.name,
                    context: geocodeContext,
                }),
            });

            console.log('[Add to Map] Geocode response status:', geocodeResponse.status);
            if (geocodeResponse.ok) {
                const geocodeData = await geocodeResponse.json();
                console.log('[Add to Map] Geocode data:', geocodeData);
                if (geocodeData.success && geocodeData.coordinates) {
                    console.log('[Add to Map] Adding pin to map:', location.name, 'at', geocodeData.coordinates);
                    const coords = geocodeData.coordinates as [number, number];

                    // Find nearest itinerary stop to link this location as a child
                    const parentStopId = findNearestItineraryStop(coords);
                    console.log('[Add to Map] Parent stop ID:', parentStopId);

                    // Fetch place details with photos from Google Places API
                    let placeDetails: PlaceDetails | undefined;
                    try {
                        const searchQuery = location.area
                            ? `${location.name}, ${location.area}, ${activeChat.destination}`
                            : `${location.name}, ${activeChat.destination}`;
                        console.log('[Add to Map] Fetching place details for query:', searchQuery);
                        const placesResponse = await fetch('/api/google/places', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                query: searchQuery,
                                location: coords,
                            }),
                        });
                        console.log('[Add to Map] Places API response status:', placesResponse.status);
                        if (placesResponse.ok) {
                            const placesData = await placesResponse.json();
                            console.log('[Add to Map] Places API response data:', JSON.stringify(placesData, null, 2));
                            if (placesData.success && placesData.place) {
                                placeDetails = {
                                    placeId: placesData.place.placeId,
                                    address: placesData.place.address,
                                    rating: placesData.place.rating,
                                    reviewCount: placesData.place.reviewCount,
                                    photos: placesData.place.photos,
                                    website: placesData.place.website,
                                    phone: placesData.place.phone,
                                    priceLevel: placesData.place.priceLevel,
                                    openingHours: placesData.place.openingHours,
                                };
                                console.log('[Add to Map] Got place details with', placesData.place.photos?.length || 0, 'photos');
                                console.log('[Add to Map] placeDetails object:', JSON.stringify(placeDetails, null, 2));
                            } else {
                                console.warn('[Add to Map] Places API returned no place data:', placesData);
                            }
                        } else {
                            const errorText = await placesResponse.text();
                            console.error('[Add to Map] Places API error response:', placesResponse.status, errorText);
                        }
                    } catch (placesError) {
                        console.error('[Add to Map] Could not fetch place details:', placesError);
                    }

                    addMapPin(activeChat.id, {
                        name: location.name,
                        type: location.type,
                        description: location.description,
                        coordinates: coords,
                        sourceMessageIndex: messageIndex,
                        parentStopId, // Link to nearest itinerary stop
                        placeDetails,
                    });
                    // Center the map on the newly added pin
                    updateMapView(activeChat.id, coords, 14);
                    setAddedLocations(prev => new Set([...prev, location.name.toLowerCase()]));
                    console.log('[Add to Map] Pin added successfully, map centered on', coords);
                } else {
                    console.warn(`[Add to Map] Could not find coordinates for ${location.name}`, geocodeData);
                }
            } else {
                console.error('[Add to Map] Geocode request failed:', geocodeResponse.status, geocodeResponse.statusText);
            }
        } catch (e) {
            console.error(`[Add to Map] Failed to geocode ${location.name}:`, e);
        } finally {
            setAddingLocation(null);
        }
    }, [activeChat, addMapPin, addedLocations, updateMapView, findNearestItineraryStop]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeChat?.messages]);

    // Check if a location is already on the map (by name)
    const isLocationOnMap = useCallback((locationName: string): boolean => {
        if (!activeChat) return false;
        const nameLower = locationName.toLowerCase();
        return activeChat.mapPins.some(pin => pin.name.toLowerCase() === nameLower);
    }, [activeChat]);

    // Open the cost edit modal
    const openCostEditModal = (cost: ExtractedCost, messageIndex: number) => {
        setEditingCost({ ...cost }); // Clone to allow editing
        setEditingCostMessageIndex(messageIndex);
    };

    // Note: isCostInBudget moved to BudgetReviewPanel for deduplication logic

    // Render message content with inline location and cost buttons
    const renderMessageContent = (content: string, messageIndex: number, isAssistant: boolean) => {
        // For user messages, just render with basic markdown
        if (!isAssistant) {
            return (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                    }}
                >
                    {content}
                </ReactMarkdown>
            );
        }

        const originalLocations = messageLocations[messageIndex] || [];
        const locations = [...originalLocations];
        const originalCosts = messageCosts[messageIndex] || [];
        const costs = [...originalCosts];

        if (locations.length > 0) {
            console.log('[Render] ChatId:', activeChat?.id, 'Message index:', messageIndex, 'Locations found:', locations.length, 'Locations:', locations.map(l => l.name));
        }
        if (costs.length > 0) {
            console.log('[Render] ChatId:', activeChat?.id, 'Message index:', messageIndex, 'Costs found:', costs.length, 'Costs:', costs.map(c => `${c.name}: $${c.amount}`));
        }
        const extractKey = activeChat ? `${activeChat.id}-${messageIndex}` : '';
        const isExtracting = extractingLocations.has(extractKey);
        const costExtractKey = activeChat ? `costs-${activeChat.id}-${messageIndex}` : '';
        const isExtractingCosts = extractingCosts.has(costExtractKey);

        // Track which locations have been shown (by name, lowercase)
        const shownLocations = new Set<string>();

        // Build placeholder mapping for inline location buttons (costs handled by BudgetReviewPanel)
        const placeholderMap = new Map<string, { type: 'location'; data: ExtractedLocation }>();
        let processedContent = content;

        // For each location, find where it appears and mark it for button insertion
        for (const loc of locations) {
            const locLower = loc.name.toLowerCase();
            if (shownLocations.has(locLower)) continue;

            const regex = new RegExp(`(${loc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
            const match = processedContent.match(regex);

            if (match) {
                const placeholder = `⟦LOC${placeholderMap.size}⟧`;
                processedContent = processedContent.replace(regex, `$1${placeholder}`);
                placeholderMap.set(placeholder, { type: 'location', data: loc });
                shownLocations.add(locLower);
            }
        }

        // Note: Cost placeholders removed - all costs are now shown in BudgetReviewPanel at the end of the message

        // Helper to render inline location buttons from placeholders in text
        const renderTextWithButtons = (text: string): React.ReactNode => {
            const placeholderRegex = /⟦LOC\d+⟧/g;
            const parts: React.ReactNode[] = [];
            let lastIndex = 0;
            let match;
            let keyIdx = 0;

            while ((match = placeholderRegex.exec(text)) !== null) {
                // Add text before placeholder
                if (match.index > lastIndex) {
                    parts.push(text.slice(lastIndex, match.index));
                }

                const placeholder = match[0];
                const data = placeholderMap.get(placeholder);

                if (data) {
                    const location = data.data;
                    const isOnMap = isLocationOnMap(location.name) || addedLocations.has(location.name.toLowerCase());
                    const isAdding = addingLocation === location.name;

                    if (!isOnMap) {
                        parts.push(
                            <button
                                key={`loc-btn-${keyIdx++}`}
                                onClick={() => addLocationToMap(location, messageIndex)}
                                disabled={isAdding}
                                className={clsx(
                                    "inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] transition-colors align-middle mx-0.5",
                                    isAdding
                                        ? "bg-stone-600 text-stone-300 cursor-wait"
                                        : "bg-orange-600/30 hover:bg-orange-600/50 text-orange-400 hover:text-orange-300 border border-orange-500/30"
                                )}
                                title={`Add ${location.name} to map`}
                            >
                                {isAdding ? (
                                    <Loader2 size={10} className="animate-spin" />
                                ) : (
                                    <>
                                        <Plus size={10} />
                                        <MapPin size={10} />
                                    </>
                                )}
                            </button>
                        );
                    } else {
                        parts.push(
                            <span
                                key={`loc-check-${keyIdx++}`}
                                className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-green-600/20 text-green-400 align-middle mx-0.5"
                                title={`${location.name} is on map`}
                            >
                                <Check size={10} />
                                <MapPin size={10} />
                            </span>
                        );
                    }
                }

                lastIndex = match.index + match[0].length;
            }

            // Add remaining text
            if (lastIndex < text.length) {
                parts.push(text.slice(lastIndex));
            }

            return parts.length > 0 ? parts : text;
        };

        // Helper to process children and convert any string children with location placeholders to buttons
        const processChildren = (children: React.ReactNode): React.ReactNode => {
            return React.Children.map(children, child => {
                if (typeof child === 'string') {
                    // Check if this string contains any location placeholders
                    if (/⟦LOC\d+⟧/.test(child)) {
                        return renderTextWithButtons(child);
                    }
                    return child;
                }
                return child;
            });
        };

        // Custom markdown components with proper styling
        const markdownComponents: Components = {
            p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{processChildren(children)}</p>,
            h1: ({ children }) => <h1 className="text-xl font-bold text-orange-400 mb-3 mt-4 first:mt-0">{processChildren(children)}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-bold text-orange-400 mb-2 mt-4 first:mt-0">{processChildren(children)}</h2>,
            h3: ({ children }) => <h3 className="text-base font-bold text-orange-300 mb-2 mt-3 first:mt-0">{processChildren(children)}</h3>,
            h4: ({ children }) => <h4 className="text-sm font-bold text-stone-200 mb-2 mt-2 first:mt-0">{processChildren(children)}</h4>,
            strong: ({ children }) => <strong className="font-bold text-stone-100">{processChildren(children)}</strong>,
            em: ({ children }) => <em className="italic text-stone-300">{processChildren(children)}</em>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1 ml-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1 ml-2">{children}</ol>,
            li: ({ children }) => <li className="text-stone-300">{processChildren(children)}</li>,
            a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline font-semibold">
                    {processChildren(children)}
                </a>
            ),
            blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-orange-500/50 pl-4 py-1 my-3 italic text-stone-400 bg-stone-800/30 rounded-r">
                    {processChildren(children)}
                </blockquote>
            ),
            code: ({ className, children }) => {
                const isInline = !className;
                if (isInline) {
                    return <code className="bg-stone-800 px-1.5 py-0.5 rounded text-orange-300 text-sm font-mono">{children}</code>;
                }
                return (
                    <code className="block bg-stone-900 p-3 rounded-lg my-2 overflow-x-auto text-sm font-mono text-stone-300">
                        {children}
                    </code>
                );
            },
            pre: ({ children }) => <pre className="bg-stone-900 p-3 rounded-lg my-3 overflow-x-auto">{children}</pre>,
            hr: () => <hr className="border-stone-700 my-4" />,
        };

        // Handler for adding a single cost from BudgetReviewPanel
        const handleAddSingleCost = (cost: ExtractedCost) => {
            if (!activeChat) return;
            addCostItem(activeChat.id, {
                name: cost.name.trim(),
                category: cost.category,
                amount: cost.amount,
                quantity: cost.quantity,
                unit: cost.unit,
                notes: cost.notes,
                isEstimate: false,
            });
            setAddedCosts(prev => new Set([...prev, cost.name.toLowerCase()]));
        };

        // Handler for adding all costs from BudgetReviewPanel
        const handleAddAllCosts = (costsToAdd: ExtractedCost[]) => {
            if (!activeChat) return;
            costsToAdd.forEach(cost => {
                addCostItem(activeChat.id, {
                    name: cost.name.trim(),
                    category: cost.category,
                    amount: cost.amount,
                    quantity: cost.quantity,
                    unit: cost.unit,
                    notes: cost.notes,
                    isEstimate: false,
                });
            });
            setAddedCosts(prev => {
                const newSet = new Set(prev);
                costsToAdd.forEach(c => newSet.add(c.name.toLowerCase()));
                return newSet;
            });
        };

        return (
            <>
                <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                >
                    {processedContent}
                </ReactMarkdown>
                {(isExtracting || isExtractingCosts) && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
                        <Loader2 size={12} className="animate-spin" />
                        {isExtracting ? tMap('findingLocations') : 'Finding costs...'}
                    </div>
                )}
                {/* Budget Review Panel - shows all extracted costs with smart deduplication */}
                {costs.length > 0 && !isExtractingCosts && (
                    <BudgetReviewPanel
                        costs={costs}
                        existingBudgetItems={activeChat?.tripCosts?.items || []}
                        touristTraps={activeChat?.touristTraps || []}
                        onAddCost={handleAddSingleCost}
                        onAddAllCosts={handleAddAllCosts}
                        onEditCost={(cost) => openCostEditModal(cost, messageIndex)}
                        tripDays={activeChat?.tripContext?.tripDurationDays || 14}
                    />
                )}
                {/* Show extracted itinerary with "Use This Itinerary" button */}
                {activeChat?.extractedItineraries?.[messageIndex]?.hasItinerary && (
                    <div className="mt-3 p-3 bg-gradient-to-r from-orange-900/30 to-amber-900/20 border border-orange-500/30 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-orange-400" />
                                <span className="text-sm font-semibold text-orange-300">
                                    Itinerary Detected ({activeChat.extractedItineraries[messageIndex].totalDays} days)
                                </span>
                            </div>
                            {addedItineraryFromMessage === messageIndex ? (
                                <span className="flex items-center gap-1 text-xs bg-green-600/30 text-green-400 px-2 py-1 rounded">
                                    <Check size={12} />
                                    Added to Trip
                                </span>
                            ) : (
                                <button
                                    onClick={() => addItineraryToTrip(messageIndex)}
                                    className="flex items-center gap-1 text-xs bg-orange-600 hover:bg-orange-500 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                                >
                                    <Plus size={12} />
                                    Use This Itinerary
                                </button>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {activeChat.extractedItineraries[messageIndex].stops.slice(0, 6).map((stop, idx) => (
                                <span
                                    key={idx}
                                    className="text-[11px] bg-stone-800/80 text-stone-300 px-2 py-0.5 rounded flex items-center gap-1"
                                >
                                    <MapPin size={10} className="text-orange-400" />
                                    {stop.location}
                                    <span className="text-stone-500">({stop.days}d)</span>
                                </span>
                            ))}
                            {activeChat.extractedItineraries[messageIndex].stops.length > 6 && (
                                <span className="text-[11px] text-stone-500 px-2 py-0.5">
                                    +{activeChat.extractedItineraries[messageIndex].stops.length - 6} more
                                </span>
                            )}
                        </div>
                    </div>
                )}
            </>
        );
    };

    const sendMessage = async () => {
        if (!input.trim() || !activeChat) return;

        const userMsg = { role: 'user' as const, content: input };
        const chatId = activeChat.id; // Capture for use in async callbacks
        const destination = activeChat.destination;
        addMessage(chatId, userMsg);
        setInput('');
        setIsLoading(true);

        // Auto-update title from first user message
        if (activeChat.messages.length === 1 && activeChat.title === 'New Trip') {
            const newTitle = input.slice(0, 30) + (input.length > 30 ? '...' : '');
            updateChat(chatId, { title: newTitle });
        }

        // Build the request body
        const requestBody = {
            message: userMsg.content,
            history: activeChat.messages,
            destination: destination,
            budget: activeChat.budget,
            user_profile: isProfileSet ? {
                name: profile.name,
                country_of_origin: profile.countryOfOrigin,
                passport_country: profile.passportCountry,
                travel_style: profile.travelStyle,
                budget_preference: profile.budgetPreference,
                countries_visited: profile.countriesVisited,
                bucket_list: profile.bucketList,
                interests: profile.interests,
                restrictions: profile.restrictions,
                risk_tolerance: profile.riskTolerance,
                comfort_threshold: profile.comfortThreshold,
                hygiene_threshold: profile.hygieneThreshold,
                activity_weighting: profile.activityWeighting,
                food_preference: profile.foodPreference,
                travel_pace: profile.travelPace,
                electronics_tolerance: profile.electronicsTolerance,
                pack_weight: profile.packWeight,
                income_type: profile.incomeType,
                monthly_budget: profile.monthlyBudget,
                walk_at_night: profile.walkAtNight,
                experienced_motos: profile.experiencedMotos,
                open_to_couchsurfing: profile.openToCouchsurfing,
                female_traveler_concerns: profile.femaleTravelerConcerns,
                instagram_friendly: profile.instagramFriendly,
                hidden_spots: profile.hiddenSpots,
                video_focus: profile.videoFocus,
                sunrise_sunset_optimization: profile.sunriseSunsetOptimization,
            } : null,
            trip_context: activeChat.tripSetupComplete ? {
                itinerary_breakdown: activeChat.tripContext.itineraryBreakdown,
                transportation_styles: activeChat.tripContext.transportationStyles,
                accommodation_styles: activeChat.tripContext.accommodationStyles,
                daily_budget_target: activeChat.tripContext.dailyBudgetTarget,
                trip_duration_days: activeChat.tripContext.tripDurationDays,
                start_date: activeChat.tripContext.startDate,
                deal_breakers: activeChat.tripContext.dealBreakers,
                preferred_language: activeChat.tripContext.preferredLanguage,
                trip_goals: activeChat.tripContext.tripGoals,
                custom_goals: activeChat.tripContext.customGoals,
                walk_at_night_override: activeChat.tripContext.walkAtNightOverride,
                experienced_motos_override: activeChat.tripContext.experiencedMotosOverride,
                open_to_couchsurfing_override: activeChat.tripContext.openToCouchsurfingOverride,
                instagram_friendly_override: activeChat.tripContext.instagramFriendlyOverride,
                hidden_spots_override: activeChat.tripContext.hiddenSpotsOverride,
                video_focus_override: activeChat.tripContext.videoFocusOverride,
                needs_visa: activeChat.tripContext.needsVisa,
                visa_on_arrival: activeChat.tripContext.visaOnArrival,
                visa_notes: activeChat.tripContext.visaNotes,
            } : null,
            // Conversation variables for personalization
            conversation_variables: activeChat.conversationVariables ? {
                places_discussed: activeChat.conversationVariables.placesDiscussed,
                places_to_avoid: activeChat.conversationVariables.placesToAvoid,
                activity_preferences: activeChat.conversationVariables.activityPreferences,
                food_preferences: activeChat.conversationVariables.foodPreferences,
                accommodation_notes: activeChat.conversationVariables.accommodationNotes,
                travel_companions: activeChat.conversationVariables.travelCompanions,
                pace_preference: activeChat.conversationVariables.pacePreference,
                must_do_activities: activeChat.conversationVariables.mustDoActivities,
                concerns: activeChat.conversationVariables.concerns,
                budget_notes: activeChat.conversationVariables.budgetNotes,
                custom_notes: activeChat.conversationVariables.customNotes,
            } : null,
        };

        // Log the full request body for debugging (visible in browser console)
        console.log('='.repeat(80));
        console.log('[CHAT REQUEST] Sending to API:');
        console.log('Destination:', requestBody.destination);
        console.log('Budget:', requestBody.budget);
        console.log('User Profile:', requestBody.user_profile);
        console.log('Trip Context:', requestBody.trip_context);
        console.log('Conversation Variables:', requestBody.conversation_variables);
        console.log('Full Request Body:', JSON.stringify(requestBody, null, 2));
        console.log('='.repeat(80));

        // Capture user message for extraction after response
        const userMsgContent = userMsg.content;

        try {
            // Use non-streaming endpoint for cleaner response handling
            const response = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            const fullResponse = data.response || data.message || '';

            // Add the response to messages
            addMessage(chatId, { role: 'assistant', content: fullResponse });

            // Extract locations, costs, itinerary, and conversation variables
            const assistantMsgIdx = activeChat.messages.length + 1;
            const tripDays = activeChat.tripContext?.tripDurationDays || 0;
            console.log('[Extraction] Extracting from message at index:', assistantMsgIdx, 'trip_days:', tripDays);
            if (fullResponse.length > 100) {
                extractLocationsFromMessage(fullResponse, assistantMsgIdx, chatId, destination);
                extractCostsFromMessage(fullResponse, assistantMsgIdx, chatId, destination, tripDays);
                // Extract itinerary if the response looks like it might contain one
                if (fullResponse.toLowerCase().includes('day') && (fullResponse.includes(':') || fullResponse.includes('-'))) {
                    extractItineraryFromMessage(fullResponse, assistantMsgIdx, chatId, destination);
                }
                // Extract conversation variables from the exchange
                extractConversationVariables(userMsgContent, fullResponse, chatId, destination);
            }
        } catch (error) {
            console.error(error);
            addMessage(chatId, { role: 'assistant', content: "Sorry, something went wrong. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    if (!activeChat) {
        return (
            <div className="flex w-full h-[80vh] bg-stone-800 rounded-2xl overflow-hidden shadow-2xl border border-stone-700 items-center justify-center">
                <p className="text-stone-500">Loading...</p>
            </div>
        );
    }

    const tripCtx = activeChat.tripContext;
    const hasItinerary = tripCtx.itineraryBreakdown && tripCtx.itineraryBreakdown.length > 0;
    const hasGoals = tripCtx.tripGoals && tripCtx.tripGoals.length > 0;

    // Helper function to open a mobile panel
    const openMobilePanel = (panel: 'map' | 'costs' | 'bucket' | 'packing' | 'events') => {
        setMobilePanel(panel);
        setRightPanelTab(panel); // Keep in sync for when switching back to desktop
    };

    // Close mobile panel and return to chat
    const closeMobilePanel = () => {
        setMobilePanel(null);
    };

    return (
        <>
            <div className="flex w-full h-[90vh] bg-stone-800 rounded-2xl overflow-hidden shadow-2xl border border-stone-700 relative">
                {/* Left Sidebar - Trips List (hidden on mobile, shown on md+) */}
                <ChatSidebar />

                {/* Mobile Sidebar Overlay */}
                <AnimatePresence>
                    {isMobileSidebarOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/60 z-40 md:hidden"
                                onClick={() => setIsMobileSidebarOpen(false)}
                            />
                            {/* Sidebar Drawer */}
                            <motion.div
                                initial={{ x: '-100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '-100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                className="fixed left-0 top-0 bottom-0 w-72 bg-stone-900 z-50 md:hidden shadow-2xl"
                            >
                                <div className="flex items-center justify-between p-4 border-b border-stone-700">
                                    <span className="font-semibold text-orange-400">Your Trips</span>
                                    <button
                                        onClick={() => setIsMobileSidebarOpen(false)}
                                        className="p-2 hover:bg-stone-800 rounded-lg transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <ChatSidebar isMobileDrawer onSelectChat={() => setIsMobileSidebarOpen(false)} />
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Main Content Area - Chat + Map Split */}
                <div className="flex-1 flex">
                    {/* Chat Section - Full width on mobile, half on desktop when panel expanded */}
                    <div className={clsx(
                        "flex flex-col bg-stone-800 transition-all duration-300",
                        // On mobile: always full width (panel shows as overlay)
                        // On md+: half width when panel expanded, full width when collapsed
                        isMapExpanded ? "w-full md:w-1/2" : "flex-1"
                    )}>
                        {/* Chat Header */}
                        <div className="flex items-center justify-between px-4 py-2 border-b border-stone-700 bg-stone-900">
                            <div className="flex items-center gap-2">
                                {/* Mobile menu button */}
                                <button
                                    onClick={() => setIsMobileSidebarOpen(true)}
                                    className="p-1.5 hover:bg-stone-700 rounded transition-colors md:hidden"
                                    title="Open trips menu"
                                >
                                    <Menu size={18} />
                                </button>
                                <MessageSquare size={16} className="text-orange-500" />
                                <span className="text-sm font-medium hidden sm:inline">Chat with Sierra</span>
                                <span className="text-sm font-medium sm:hidden">Sierra</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowTripContext(!showTripContext)}
                                    className={clsx(
                                        "p-1.5 rounded transition-colors text-xs flex items-center gap-1",
                                        showTripContext ? "bg-orange-600 text-white" : "hover:bg-stone-700 text-stone-400"
                                    )}
                                    title="Trip settings"
                                >
                                    <Settings size={14} />
                                </button>
                                {!isMapExpanded && (
                                    <button
                                        onClick={() => setIsMapExpanded(true)}
                                        className="p-1.5 hover:bg-stone-700 rounded transition-colors text-stone-400 flex items-center gap-1"
                                        title="Show map"
                                    >
                                        <MapIcon size={14} />
                                        {activeChat.mapPins.length > 0 && (
                                            <span className="bg-orange-600 text-white text-xs px-1 py-0.5 rounded-full text-[10px]">
                                                {activeChat.mapPins.length}
                                            </span>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Trip Context Dropdown */}
                        <AnimatePresence>
                            {showTripContext && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-b border-stone-700 bg-stone-900"
                                >
                                    <div className="p-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-xs text-stone-400 uppercase font-bold flex items-center gap-1">
                                                    <MapPin size={10} /> {tTripSetup('mainDestination')}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={activeChat.destination}
                                                    onChange={(e) => updateChat(activeChat.id, { destination: e.target.value })}
                                                    className="w-full bg-stone-800 border border-stone-700 rounded p-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs text-stone-400 uppercase font-bold flex items-center gap-1">
                                                    <DollarSign size={10} /> {tProfile('budgetStyle')}
                                                </label>
                                                <select
                                                    value={activeChat.budget}
                                                    onChange={(e) => updateChat(activeChat.id, { budget: e.target.value })}
                                                    className="w-full bg-stone-800 border border-stone-700 rounded p-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                                                >
                                                    <option>{tProfile('brokeBackpacker')}</option>
                                                    <option>{tProfile('flashpacker')}</option>
                                                    <option>{tProfile('digitalNomad')}</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsTripSetupOpen(true)}
                                                className={clsx(
                                                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                                                    activeChat.tripSetupComplete
                                                        ? "bg-stone-800 hover:bg-stone-700 border border-stone-700"
                                                        : "bg-orange-600 hover:bg-orange-500 text-white"
                                                )}
                                            >
                                                <Compass size={14} />
                                                {activeChat.tripSetupComplete ? tTripSetup('title') : tTripSetup('title')}
                                            </button>
                                            <button
                                                onClick={() => setIsProfileOpen(true)}
                                                className="flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 px-3 py-2 rounded-lg text-xs transition-colors"
                                            >
                                                <User size={14} />
                                                {tProfile('title')}
                                            </button>
                                        </div>
                                        {activeChat.tripSetupComplete && (
                                            <div className="flex flex-wrap gap-1 text-xs">
                                                <span className="bg-stone-700 px-2 py-0.5 rounded text-stone-300">
                                                    {tripCtx.tripDurationDays}d
                                                </span>
                                                <span className="bg-stone-700 px-2 py-0.5 rounded text-stone-300">
                                                    ${tripCtx.dailyBudgetTarget}/day
                                                </span>
                                                {hasGoals && tripCtx.tripGoals.slice(0, 2).map(goal => (
                                                    <span key={goal} className="bg-orange-900/30 border border-orange-500/30 px-2 py-0.5 rounded text-orange-300">
                                                        {goal.replace(/_/g, ' ')}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-stone-600">
                            <AnimatePresence>
                                {activeChat.messages.map((msg, idx) => (
                                    <motion.div
                                        key={`${activeChat.id}-${idx}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={clsx(
                                            "flex w-full",
                                            msg.role === 'user' ? "justify-end" : "justify-start"
                                        )}
                                    >
                                        <div className={clsx(
                                            "max-w-[90%] rounded-2xl p-3 text-sm leading-relaxed",
                                            msg.role === 'user'
                                                ? "bg-orange-600 text-white rounded-tr-none"
                                                : "bg-stone-700 text-stone-100 rounded-tl-none"
                                        )}>
                                            {renderMessageContent(msg.content, idx, msg.role === 'assistant')}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex justify-start"
                                >
                                    <div className="bg-stone-700 rounded-2xl rounded-tl-none p-4 text-sm max-w-[90%]">
                                        <ThinkingAnimation />
                                    </div>
                                </motion.div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area - extra padding at bottom for mobile nav bar */}
                        <div className="p-3 pb-20 md:pb-3 bg-stone-900 border-t border-stone-700">
                            {activeChat?.tripSetupComplete ? (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                        placeholder={t('typeMessage')}
                                        className="flex-1 bg-stone-800 text-stone-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                                    />
                                    <button
                                        onClick={sendMessage}
                                        disabled={isLoading}
                                        className="bg-orange-600 hover:bg-orange-500 text-white p-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setIsTripSetupOpen(true)}
                                    className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Compass size={18} />
                                    {tTripSetup('title')}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Map & Costs (DESKTOP ONLY - hidden on mobile) */}
                    {isMapExpanded && (
                        <div className="hidden md:flex w-1/2 flex-col border-l border-stone-700 relative">
                            {/* Collapse Button */}
                            <button
                                onClick={() => setIsMapExpanded(false)}
                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 bg-stone-800 hover:bg-stone-700 border border-stone-600 rounded-full p-1.5 shadow-lg transition-colors"
                                title="Collapse panel"
                            >
                                <ChevronRight size={14} />
                            </button>

                            {/* Tab Bar */}
                            <div className="flex border-b border-stone-700 bg-stone-800 overflow-x-auto">
                                <button
                                    onClick={() => setRightPanelTab('map')}
                                    className={clsx(
                                        "flex-1 flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] font-medium transition-colors min-w-0",
                                        rightPanelTab === 'map'
                                            ? "text-orange-400 border-b-2 border-orange-500 bg-stone-900/50"
                                            : "text-stone-400 hover:text-stone-200"
                                    )}
                                >
                                    <MapIcon size={13} />
                                    <span className="hidden sm:inline">{tMap('title')}</span>
                                    {(activeChat?.mapPins?.length ?? 0) > 0 && (
                                        <span className="bg-orange-600/30 text-orange-400 text-[10px] px-1 py-0.5 rounded-full">
                                            {activeChat?.mapPins?.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setRightPanelTab('bucket')}
                                    className={clsx(
                                        "flex-1 flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] font-medium transition-colors min-w-0",
                                        rightPanelTab === 'bucket'
                                            ? "text-orange-400 border-b-2 border-orange-500 bg-stone-900/50"
                                            : "text-stone-400 hover:text-stone-200"
                                    )}
                                >
                                    <ListChecks size={13} />
                                    <span className="hidden sm:inline">{tBucket('title')}</span>
                                    {(activeChat?.bucketList?.length ?? 0) > 0 && (
                                        <span className="bg-purple-600/30 text-purple-400 text-[10px] px-1 py-0.5 rounded-full">
                                            {activeChat?.bucketList?.filter(i => i.completed).length}/{activeChat?.bucketList?.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setRightPanelTab('packing')}
                                    className={clsx(
                                        "flex-1 flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] font-medium transition-colors min-w-0",
                                        rightPanelTab === 'packing'
                                            ? "text-orange-400 border-b-2 border-orange-500 bg-stone-900/50"
                                            : "text-stone-400 hover:text-stone-200"
                                    )}
                                >
                                    <Backpack size={13} />
                                    <span className="hidden sm:inline">{tPacking('title')}</span>
                                    {(activeChat?.packingList?.items?.length ?? 0) > 0 && (
                                        <span className="bg-blue-600/30 text-blue-400 text-[10px] px-1 py-0.5 rounded-full">
                                            {activeChat?.packingList?.items?.filter(i => i.packed).length}/{activeChat?.packingList?.items?.length}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setRightPanelTab('costs')}
                                    className={clsx(
                                        "flex-1 flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] font-medium transition-colors min-w-0",
                                        rightPanelTab === 'costs'
                                            ? "text-orange-400 border-b-2 border-orange-500 bg-stone-900/50"
                                            : "text-stone-400 hover:text-stone-200"
                                    )}
                                >
                                    <Calculator size={13} />
                                    <span className="hidden sm:inline">{tCosts('title')}</span>
                                    {(activeChat?.tripCosts?.items?.length ?? 0) > 0 && (
                                        <span className="bg-green-600/30 text-green-400 text-[10px] px-1 py-0.5 rounded-full">
                                            ${activeChat?.tripCosts?.items?.reduce((sum, item) => sum + item.amount * item.quantity, 0).toFixed(0)}
                                        </span>
                                    )}
                                </button>
                                <button
                                    onClick={() => setRightPanelTab('events')}
                                    className={clsx(
                                        "flex-1 flex items-center justify-center gap-1 px-1.5 py-2 text-[11px] font-medium transition-colors min-w-0",
                                        rightPanelTab === 'events'
                                            ? "text-orange-400 border-b-2 border-orange-500 bg-stone-900/50"
                                            : "text-stone-400 hover:text-stone-200"
                                    )}
                                >
                                    <CalendarDays size={13} />
                                    <span className="hidden sm:inline">{tEvents('title')}</span>
                                    {(activeChat?.eventsData?.events?.length ?? 0) > 0 && (
                                        <span className="bg-pink-600/30 text-pink-400 text-[10px] px-1 py-0.5 rounded-full">
                                            {activeChat?.eventsData?.events?.filter(e => e.isInterested).length || activeChat?.eventsData?.events?.length}
                                        </span>
                                    )}
                                </button>
                            </div>

                            {/* Panel Content */}
                            <div className="flex-1 overflow-hidden">
                                {rightPanelTab === 'map' && (
                                    <MapPanel
                                        isExpanded={isMapExpanded}
                                        onToggle={() => setIsMapExpanded(false)}
                                    />
                                )}
                                {rightPanelTab === 'bucket' && <BucketListPanel />}
                                {rightPanelTab === 'packing' && <PackingListPanel />}
                                {rightPanelTab === 'costs' && <CostDashboard />}
                                {rightPanelTab === 'events' && <EventsPanel />}
                            </div>
                        </div>
                    )}
                </div>

                {/* Mobile Bottom Navigation Bar */}
                <div className="absolute bottom-0 left-0 right-0 md:hidden bg-stone-900 border-t border-stone-700 px-2 py-1.5 flex items-center justify-around z-30">
                    <button
                        onClick={() => openMobilePanel('map')}
                        className={clsx(
                            "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors",
                            mobilePanel === 'map' ? "text-orange-400 bg-orange-600/20" : "text-stone-400"
                        )}
                    >
                        <MapIcon size={20} />
                        <span className="text-[10px]">{tMap('title')}</span>
                        {(activeChat?.mapPins?.length ?? 0) > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 bg-orange-600 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full">
                                {activeChat?.mapPins?.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => openMobilePanel('bucket')}
                        className={clsx(
                            "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors relative",
                            mobilePanel === 'bucket' ? "text-purple-400 bg-purple-600/20" : "text-stone-400"
                        )}
                    >
                        <ListChecks size={20} />
                        <span className="text-[10px]">{tBucket('title')}</span>
                    </button>
                    <button
                        onClick={() => openMobilePanel('packing')}
                        className={clsx(
                            "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors relative",
                            mobilePanel === 'packing' ? "text-blue-400 bg-blue-600/20" : "text-stone-400"
                        )}
                    >
                        <Backpack size={20} />
                        <span className="text-[10px]">{tPacking('title')}</span>
                    </button>
                    <button
                        onClick={() => openMobilePanel('costs')}
                        className={clsx(
                            "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors relative",
                            mobilePanel === 'costs' ? "text-green-400 bg-green-600/20" : "text-stone-400"
                        )}
                    >
                        <Calculator size={20} />
                        <span className="text-[10px]">{tCosts('title')}</span>
                    </button>
                    <button
                        onClick={() => openMobilePanel('events')}
                        className={clsx(
                            "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors relative",
                            mobilePanel === 'events' ? "text-pink-400 bg-pink-600/20" : "text-stone-400"
                        )}
                    >
                        <CalendarDays size={20} />
                        <span className="text-[10px]">{tEvents('title')}</span>
                    </button>
                </div>

                {/* Mobile Full-Screen Panel Overlay */}
                <AnimatePresence>
                    {mobilePanel && (
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="absolute inset-0 bg-stone-800 z-40 md:hidden flex flex-col"
                        >
                            {/* Mobile Panel Header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-700 bg-stone-900">
                                <button
                                    onClick={closeMobilePanel}
                                    className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors"
                                >
                                    <ArrowLeft size={20} />
                                    <span className="text-sm font-medium">Back to Chat</span>
                                </button>
                                <span className="text-sm font-semibold capitalize flex items-center gap-2">
                                    {mobilePanel === 'map' && <><MapIcon size={16} className="text-orange-400" /> {tMap('title')}</>}
                                    {mobilePanel === 'bucket' && <><ListChecks size={16} className="text-purple-400" /> {tBucket('title')}</>}
                                    {mobilePanel === 'packing' && <><Backpack size={16} className="text-blue-400" /> {tPacking('title')}</>}
                                    {mobilePanel === 'costs' && <><Calculator size={16} className="text-green-400" /> {tCosts('title')}</>}
                                    {mobilePanel === 'events' && <><CalendarDays size={16} className="text-pink-400" /> {tEvents('title')}</>}
                                </span>
                            </div>

                            {/* Mobile Panel Content */}
                            <div className="flex-1 overflow-hidden">
                                {mobilePanel === 'map' && (
                                    <MapPanel
                                        isExpanded={true}
                                        onToggle={closeMobilePanel}
                                    />
                                )}
                                {mobilePanel === 'bucket' && <BucketListPanel />}
                                {mobilePanel === 'packing' && <PackingListPanel />}
                                {mobilePanel === 'costs' && <CostDashboard />}
                                {mobilePanel === 'events' && <EventsPanel />}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Profile Panel */}
            <ProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

            {/* Trip Setup Wizard */}
            <TripSetupWizard
                isOpen={isTripSetupOpen}
                onClose={() => setIsTripSetupOpen(false)}
                chatId={activeChat.id}
            />

            {/* Budget Item Edit Modal */}
            <AnimatePresence>
                {editingCost && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
                        onClick={() => setEditingCost(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-stone-800 rounded-xl p-6 w-full max-w-md border border-stone-700 shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <DollarSign size={20} className="text-green-400" />
                                    {tCosts('addItem')}
                                </h3>
                                <button
                                    onClick={() => setEditingCost(null)}
                                    className="text-stone-400 hover:text-stone-200 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-xs text-stone-400 uppercase font-bold mb-1">
                                        {tCosts('itemName')}
                                    </label>
                                    <input
                                        type="text"
                                        value={editingCost.name}
                                        onChange={e => setEditingCost({ ...editingCost, name: e.target.value })}
                                        className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm focus:outline-none focus:border-green-500 transition-colors"
                                        placeholder="Hostel, Food, Transport..."
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-xs text-stone-400 uppercase font-bold mb-1">
                                        {tCosts('category')}
                                    </label>
                                    <select
                                        value={editingCost.category}
                                        onChange={e => setEditingCost({ ...editingCost, category: e.target.value as CostCategory })}
                                        className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm focus:outline-none focus:border-green-500 transition-colors"
                                    >
                                        <option value="accommodation">{tCosts('accommodation')}</option>
                                        <option value="transport">{tCosts('transport')}</option>
                                        <option value="food">{tCosts('food')}</option>
                                        <option value="activities">{tCosts('activities')}</option>
                                        <option value="visa">{tCosts('visa')}</option>
                                        <option value="insurance">{tCosts('insurance')}</option>
                                        <option value="gear">{tCosts('gear')}</option>
                                        <option value="misc">{tCosts('misc')}</option>
                                    </select>
                                </div>

                                {/* Amount & Quantity Row */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-stone-400 uppercase font-bold mb-1">
                                            {tCosts('amount')} ($)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={editingCost.amount}
                                            onChange={e => setEditingCost({ ...editingCost, amount: parseFloat(e.target.value) || 0 })}
                                            className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm focus:outline-none focus:border-green-500 transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-stone-400 uppercase font-bold mb-1">
                                            {tCosts('quantity')}
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={editingCost.quantity}
                                            onChange={e => setEditingCost({ ...editingCost, quantity: parseInt(e.target.value) || 1 })}
                                            className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm focus:outline-none focus:border-green-500 transition-colors"
                                        />
                                    </div>
                                </div>

                                {/* Unit */}
                                <div>
                                    <label className="block text-xs text-stone-400 uppercase font-bold mb-1">
                                        {tCosts('unit')}
                                    </label>
                                    <select
                                        value={editingCost.unit}
                                        onChange={e => setEditingCost({ ...editingCost, unit: e.target.value })}
                                        className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm focus:outline-none focus:border-green-500 transition-colors"
                                    >
                                        <option value="night">{tCosts('perNight')}</option>
                                        <option value="day">{tCosts('perDay')}</option>
                                        <option value="trip">{tCosts('perTrip')}</option>
                                        <option value="person">{tCosts('perPerson')}</option>
                                        <option value="meal">{tCosts('perMeal')}</option>
                                    </select>
                                </div>

                                {/* Notes */}
                                <div>
                                    <label className="block text-xs text-stone-400 uppercase font-bold mb-1">
                                        {tCosts('notes')}
                                    </label>
                                    <textarea
                                        value={editingCost.notes}
                                        onChange={e => setEditingCost({ ...editingCost, notes: e.target.value })}
                                        className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm focus:outline-none focus:border-green-500 transition-colors resize-none"
                                        rows={2}
                                        placeholder="Optional notes..."
                                    />
                                </div>

                                {/* Total Preview */}
                                <div className="bg-stone-900/50 rounded-lg p-3 border border-stone-700">
                                    <div className="flex items-center justify-between">
                                        <span className="text-stone-400 text-sm">{tCosts('total')}:</span>
                                        <span className="text-lg font-bold text-green-400">
                                            ${(editingCost.amount * editingCost.quantity).toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => setEditingCost(null)}
                                        className="flex-1 px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (!activeChat || !editingCost.name.trim()) return;
                                            addCostItem(activeChat.id, {
                                                name: editingCost.name.trim(),
                                                category: editingCost.category,
                                                amount: editingCost.amount,
                                                quantity: editingCost.quantity,
                                                unit: editingCost.unit,
                                                notes: editingCost.notes,
                                                isEstimate: false,
                                            });
                                            setAddedCosts(prev => new Set([...prev, editingCost.name.toLowerCase()]));
                                            setEditingCost(null);
                                        }}
                                        disabled={!editingCost.name.trim() || editingCost.amount <= 0}
                                        className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-stone-700 disabled:text-stone-500 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Plus size={16} />
                                        {tCosts('addItem')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
