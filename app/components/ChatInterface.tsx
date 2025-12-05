"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, MapPin, DollarSign, User, Settings, Compass, Calendar, Target, Map as MapIcon, Plus, Check, Loader2, MessageSquare, ChevronLeft, ChevronRight, Calculator, ListChecks, Backpack, CalendarDays, Mountain, Sailboat, Tent, Footprints } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useChats, MapPinType, CostCategory, ExtractedLocation, MessageLocations } from '../context/ChatsContext';
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

// Adventure-themed thinking messages with icons
const THINKING_MESSAGES = [
    { text: "Trekking through the jungle for answers...", Icon: Footprints },
    { text: "Scaling mountain peaks to find the best routes...", Icon: Mountain },
    { text: "Sailing uncharted waters for hidden gems...", Icon: Sailboat },
    { text: "Setting up camp to research your destination...", Icon: Tent },
    { text: "Following ancient trails and local secrets...", Icon: Compass },
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
    const { activeChat, updateChat, addMessage, addMapPin, addCostItems, addTouristTrap, updateMapView, mergeConversationVariables, setExtractedLocations } = useChats();
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
    const [addingLocation, setAddingLocation] = useState<string | null>(null);
    const [addedLocations, setAddedLocations] = useState<Set<string>>(new Set());

    // Track in-flight location extraction requests
    const [extractingLocations, setExtractingLocations] = useState<Set<string>>(new Set()); // keyed by "chatId-msgIdx"

    // Global ref to track in-flight requests - never reset
    const inFlightRef = useRef<Set<string>>(new Set());

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Get locations for current chat from persisted context (survives refresh)
    const messageLocations = activeChat?.extractedLocations || {};

    // Update added locations when chat changes or pins change
    useEffect(() => {
        if (activeChat) {
            const pinned = new Set(activeChat.mapPins.map(p => p.name.toLowerCase()));
            setAddedLocations(pinned);
        }
    }, [activeChat?.id, activeChat?.mapPins]);

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
            const response = await fetch('http://localhost:8000/api/extract-locations', {
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
    const extractCostsFromMessage = useCallback(async (messageContent: string, messageIndex: number, chatId: string, destination: string) => {
        const key = `cost-${chatId}-${messageIndex}`;
        console.log('[Cost Extraction] Starting extraction for key:', key);

        // Check if already in flight
        if (inFlightRef.current.has(key)) {
            console.log('[Cost Extraction] Already in-flight, skipping:', key);
            return;
        }

        // Mark as in-flight immediately
        inFlightRef.current.add(key);

        // Determine number of travelers from profile
        const travelStyleToNum: Record<string, number> = {
            solo: 1,
            couple: 2,
            group: 4,
            family: 4,
        };
        const numTravelers = isProfileSet ? (travelStyleToNum[profile.travelStyle] || 1) : 1;

        try {
            console.log('[Cost Extraction] Calling API for:', destination, 'with', numTravelers, 'travelers');
            const response = await fetch('http://localhost:8000/api/extract-costs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    response_text: messageContent,
                    destination: destination,
                    num_travelers: numTravelers,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[Cost Extraction] API Response:', data);

                // Add extracted costs
                if (data.costs && data.costs.length > 0) {
                    const costItems = data.costs.map((cost: { category: string; name: string; amount: number; quantity: number; unit: string; notes: string }) => ({
                        category: cost.category as CostCategory,
                        name: cost.name,
                        amount: cost.amount,
                        quantity: cost.quantity || 1,
                        unit: cost.unit || 'trip',
                        notes: cost.notes || '',
                        isEstimate: false,
                        sourceMessageIndex: messageIndex,
                    }));
                    console.log('[Cost Extraction] Adding', costItems.length, 'cost items');
                    addCostItems(chatId, costItems);
                }

                // Add tourist trap warnings
                if (data.tourist_traps && data.tourist_traps.length > 0) {
                    for (const trap of data.tourist_traps) {
                        console.log('[Cost Extraction] Adding tourist trap warning:', trap.name);
                        addTouristTrap(chatId, {
                            name: trap.name,
                            description: trap.description,
                            location: trap.location || '',
                            sourceMessageIndex: messageIndex,
                        });
                    }
                }
            } else {
                console.error('[Cost Extraction] API error:', response.status, response.statusText);
            }
        } catch (e) {
            console.error('[Cost Extraction] Failed:', e);
            // Remove from in-flight on error so it can be retried
            inFlightRef.current.delete(key);
        }
    }, [addCostItems, addTouristTrap, profile.travelStyle, isProfileSet]);

    // Extract conversation variables from a message exchange
    const extractConversationVariables = useCallback(async (userMessage: string, aiResponse: string, chatId: string, destination: string) => {
        const key = `convvars-${chatId}-${Date.now()}`;
        console.log('[ConvVars Extraction] Starting extraction');

        try {
            const response = await fetch('http://localhost:8000/api/extract-conversation-vars', {
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

    // No auto-extraction effect - we trigger extraction directly after receiving a response

    // Function to add a single location to the map
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
            const geocodeResponse = await fetch('http://localhost:8000/api/geocode', {
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
                    addMapPin(activeChat.id, {
                        name: location.name,
                        type: location.type,
                        description: location.description,
                        coordinates: coords,
                        sourceMessageIndex: messageIndex,
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
    }, [activeChat, addMapPin, addedLocations, updateMapView]);

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

    // Render message content with inline location buttons
    const renderMessageContent = (content: string, messageIndex: number, isAssistant: boolean) => {
        if (!isAssistant) {
            return (
                <div dangerouslySetInnerHTML={{
                    __html: content
                        .replace(/\n/g, '<br/>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                }} />
            );
        }

        const originalLocations = messageLocations[messageIndex] || [];
        const locations = [...originalLocations];

        if (locations.length > 0) {
            console.log('[Render] ChatId:', activeChat?.id, 'Message index:', messageIndex, 'Locations found:', locations.length, 'Locations:', locations.map(l => l.name));
        }
        const extractKey = activeChat ? `${activeChat.id}-${messageIndex}` : '';
        const isExtracting = extractingLocations.has(extractKey);

        // Track which locations have been shown (by name, lowercase)
        const shownLocations = new Set<string>();

        // Process content - apply basic formatting first
        let processedContent = content
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-orange-400 hover:underline font-bold">$1</a>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        // For each location, find where it appears and mark it for button insertion
        // We'll use a placeholder system to avoid regex conflicts
        const placeholders: { placeholder: string; location: ExtractedLocation }[] = [];

        for (const loc of locations) {
            const locLower = loc.name.toLowerCase();
            if (shownLocations.has(locLower)) continue;

            // Find the location name in the content (case-insensitive)
            const regex = new RegExp(`(${loc.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
            const match = processedContent.match(regex);

            if (match) {
                const placeholder = `__LOC_BTN_${placeholders.length}__`;
                // Insert placeholder right after the location name
                processedContent = processedContent.replace(regex, `$1${placeholder}`);
                placeholders.push({ placeholder, location: loc });
                shownLocations.add(locLower);
            }
        }

        // Now split by placeholders and create React elements
        const elements: React.ReactNode[] = [];
        let remaining = processedContent;
        let partIndex = 0;

        for (const { placeholder, location } of placeholders) {
            const idx = remaining.indexOf(placeholder);
            if (idx === -1) continue;

            // Add text before the placeholder
            const before = remaining.substring(0, idx);
            if (before) {
                elements.push(
                    <span key={`text-${partIndex++}`} dangerouslySetInnerHTML={{ __html: before.replace(/\n/g, '<br/>') }} />
                );
            }

            // Add the inline button
            const isOnMap = isLocationOnMap(location.name) || addedLocations.has(location.name.toLowerCase());
            const isAdding = addingLocation === location.name;

            if (!isOnMap) {
                elements.push(
                    <button
                        key={`btn-${partIndex++}`}
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
                // Show a small "on map" indicator
                elements.push(
                    <span
                        key={`check-${partIndex++}`}
                        className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] bg-green-600/20 text-green-400 align-middle mx-0.5"
                        title={`${location.name} is on map`}
                    >
                        <Check size={10} />
                        <MapPin size={10} />
                    </span>
                );
            }

            remaining = remaining.substring(idx + placeholder.length);
        }

        // Add any remaining text
        if (remaining) {
            elements.push(
                <span key={`text-${partIndex++}`} dangerouslySetInnerHTML={{ __html: remaining.replace(/\n/g, '<br/>') }} />
            );
        }

        return (
            <>
                {elements.length > 0 ? elements : <span dangerouslySetInnerHTML={{ __html: processedContent.replace(/\n/g, '<br/>') }} />}
                {isExtracting && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
                        <Loader2 size={12} className="animate-spin" />
                        {tMap('findingLocations')}
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

        // Capture user message for extraction after response
        const userMsgContent = userMsg.content;

        try {
            // Use non-streaming endpoint for cleaner response handling
            const response = await fetch('http://localhost:8000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) throw new Error('Failed to fetch');

            const data = await response.json();
            const fullResponse = data.response || data.message || '';

            // Add the response to messages
            addMessage(chatId, { role: 'assistant', content: fullResponse });

            // Extract locations, costs, and conversation variables
            const assistantMsgIdx = activeChat.messages.length + 1;
            console.log('[Extraction] Extracting from message at index:', assistantMsgIdx);
            if (fullResponse.length > 100) {
                extractLocationsFromMessage(fullResponse, assistantMsgIdx, chatId, destination);
                extractCostsFromMessage(fullResponse, assistantMsgIdx, chatId, destination);
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

    return (
        <>
            <div className="flex w-full h-[90vh] bg-stone-800 rounded-2xl overflow-hidden shadow-2xl border border-stone-700">
                {/* Left Sidebar - Trips List */}
                <ChatSidebar />

                {/* Main Content Area - Chat + Map Split */}
                <div className="flex-1 flex">
                    {/* Chat Section */}
                    <div className={clsx(
                        "flex flex-col bg-stone-800 transition-all duration-300",
                        isMapExpanded ? "w-1/2" : "flex-1"
                    )}>
                        {/* Chat Header */}
                        <div className="flex items-center justify-between px-4 py-2 border-b border-stone-700 bg-stone-900">
                            <div className="flex items-center gap-2">
                                <MessageSquare size={16} className="text-orange-500" />
                                <span className="text-sm font-medium">Chat with Sierra</span>
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

                        {/* Input Area */}
                        <div className="p-3 bg-stone-900 border-t border-stone-700">
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

                    {/* Right Panel - Map & Costs */}
                    {isMapExpanded && (
                        <div className="w-1/2 flex flex-col border-l border-stone-700 relative">
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
            </div>

            {/* Profile Panel */}
            <ProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

            {/* Trip Setup Wizard */}
            <TripSetupWizard
                isOpen={isTripSetupOpen}
                onClose={() => setIsTripSetupOpen(false)}
                chatId={activeChat.id}
            />
        </>
    );
}
