"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useSession } from 'next-auth/react';

// ============================================
// FEATURE SET B: Trip-Level Context
// ============================================

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Trip Logistics Types
export type TransportationStyle = 'bus' | 'moto' | 'hitchhike' | 'flights' | 'train' | 'mixed';
export type AccommodationStyle = 'hostel_dorm' | 'hotel' | 'tent' | 'van' | 'guesthouse' | 'apartment' | 'couchsurfing' | 'mixed';

// Trip Goals
export type TripGoal =
  | 'surf_progression'
  | 'volunteering'
  | 'trekking_altitude'
  | 'remote_work'
  | 'nightlife'
  | 'cultural_immersion'
  | 'dating_forward'
  | 'cheap_adventure'
  | 'photography'
  | 'food_mission'
  | 'spiritual_journey'
  | 'language_learning'
  | 'custom';

export interface ItineraryStop {
  location: string;
  days: number;
  notes?: string;
}

// ============================================
// MAP PINS
// ============================================

export type MapPinType = 'accommodation' | 'restaurant' | 'activity' | 'historic' | 'transport' | 'city' | 'other';

// Extracted locations from AI responses (for "Add to Map" buttons)
export interface ExtractedLocation {
  name: string;
  type: MapPinType;
  description: string;
  area: string;
}

// Maps message index -> extracted locations for that message
export type MessageLocations = Record<number, ExtractedLocation[]>;

export interface MapPin {
  id: string;
  name: string;
  type: MapPinType;
  description?: string;
  coordinates: [number, number]; // [lng, lat]
  sourceMessageIndex: number;
  createdAt: number;
}

// ============================================
// COST CALCULATOR
// ============================================

export type CostCategory =
  | 'accommodation'
  | 'transport_local'
  | 'transport_flights'
  | 'food'
  | 'activities'
  | 'visa_border'
  | 'sim_connectivity'
  | 'moped_rental'
  | 'misc';

export interface CostItem {
  id: string;
  category: CostCategory;
  name: string;
  amount: number; // USD
  quantity: number; // e.g., 14 nights, 3 meals/day
  unit: string; // "night", "day", "trip", "meal", etc.
  notes?: string;
  isEstimate: boolean; // true if auto-calculated from region data
  sourceMessageIndex?: number; // If extracted from AI response
}

export interface TripCosts {
  items: CostItem[];
  currency: string; // Display currency (default USD)
  lastUpdated: number;
}

export const defaultTripCosts: TripCosts = {
  items: [],
  currency: 'USD',
  lastUpdated: Date.now(),
};

// Tourist trap warnings extracted from AI
export interface TouristTrap {
  id: string;
  name: string;
  description: string;
  location?: string;
  sourceMessageIndex: number;
}

// ============================================
// BUCKET LIST & PACKING LIST
// ============================================

export interface BucketListItem {
  id: string;
  text: string;
  completed: boolean;
  category?: 'experience' | 'food' | 'adventure' | 'culture' | 'photography' | 'other';
  createdAt: number;
}

export interface PackingItem {
  id: string;
  name: string;
  category: 'clothing' | 'electronics' | 'toiletries' | 'documents' | 'gear' | 'medical' | 'misc';
  packed: boolean;
  quantity: number;
  notes?: string;
}

export interface PackingList {
  items: PackingItem[];
  generatedAt?: number;
  lastUpdated: number;
}

export const defaultPackingList: PackingList = {
  items: [],
  generatedAt: undefined,
  lastUpdated: Date.now(),
};

// ============================================
// EVENTS & HAPPENINGS
// ============================================

export type EventType = 'festival' | 'concert' | 'holiday' | 'market' | 'sports' | 'cultural' | 'other';

export interface TripEvent {
  id: string;
  name: string;
  eventType: EventType;
  dateRange: string;
  location: string;
  description: string;
  isFree: boolean;
  estimatedPriceUsd: number | null; // Estimated cost in USD
  budgetTip: string;
  backpackerRating: number; // 1-5
  isInterested: boolean; // User marked as interested
  createdAt: number;
}

export interface EventsData {
  events: TripEvent[];
  travelAdvisory: string;
  lastFetched?: number;
}

export const defaultEventsData: EventsData = {
  events: [],
  travelAdvisory: '',
  lastFetched: undefined,
};

// ============================================
// CONVERSATION VARIABLES
// ============================================

export interface ConversationVariables {
  // Places mentioned in conversation
  placesDiscussed: string[];        // "Quilotoa", "Baños", "Secret Garden Hostel"
  placesToAvoid: string[];          // Places the user doesn't want to go

  // Preferences learned from conversation
  activityPreferences: string[];    // "hiking", "surfing", "nightlife"
  foodPreferences: string[];        // "vegetarian", "street food", "local cuisine"
  accommodationNotes: string[];     // "prefer hostels with social vibe", "needs AC"

  // Travel companions & style
  travelCompanions: string;         // "solo", "with partner", "group of 4 friends"
  pacePreference: string;           // "fast", "slow", "flexible"

  // Specific requests & constraints
  mustDoActivities: string[];       // Things user explicitly said they want to do
  concerns: string[];               // "altitude sickness", "safety at night", "budget"

  // Budget notes from conversation
  budgetNotes: string[];            // "can splurge on accommodation", "very tight budget"

  // Custom notes (catch-all for unique info)
  customNotes: Record<string, string>;  // {"allergies": "shellfish", "reason_for_trip": "honeymoon"}

  lastUpdated: number;
}

export const defaultConversationVariables: ConversationVariables = {
  placesDiscussed: [],
  placesToAvoid: [],
  activityPreferences: [],
  foodPreferences: [],
  accommodationNotes: [],
  travelCompanions: '',
  pacePreference: '',
  mustDoActivities: [],
  concerns: [],
  budgetNotes: [],
  customNotes: {},
  lastUpdated: Date.now(),
};

export interface TripContext {
  // Trip Logistics
  itineraryBreakdown: ItineraryStop[];
  transportationStyles: TransportationStyle[];
  accommodationStyles: AccommodationStyle[];
  dailyBudgetTarget: number; // USD
  tripDurationDays: number;
  startDate?: string; // ISO date string
  dealBreakers: string[]; // e.g., "no overnight buses", "no moldy hostels"
  preferredLanguage: string; // e.g., "Spanish", "English"

  // Traveler count for this specific trip
  travelerCount: number; // Number of travelers (1 for solo, 2 for couple, etc.)

  // Safety Profile (Trip-specific overrides)
  walkAtNightOverride?: boolean;
  experiencedMotosOverride?: boolean;
  openToCouchsurfingOverride?: boolean;

  // Special Trip Goals
  tripGoals: TripGoal[];
  customGoals: string[]; // For custom string inputs

  // Content Creation Goals (Trip-specific)
  instagramFriendlyOverride?: boolean;
  hiddenSpotsOverride?: boolean;
  videoFocusOverride?: boolean;
  sunriseSunsetOptimizationOverride?: boolean;

  // Trip-specific flags
  needsVisa: boolean;
  visaOnArrival: boolean;
  visaNotes: string;
}

export const defaultTripContext: TripContext = {
  itineraryBreakdown: [],
  transportationStyles: ['mixed'],
  accommodationStyles: ['hostel_dorm'],
  dailyBudgetTarget: 50,
  tripDurationDays: 14,
  startDate: undefined,
  dealBreakers: [],
  preferredLanguage: 'English',
  travelerCount: 1, // Default to solo traveler

  walkAtNightOverride: undefined,
  experiencedMotosOverride: undefined,
  openToCouchsurfingOverride: undefined,

  tripGoals: [],
  customGoals: [],

  instagramFriendlyOverride: undefined,
  hiddenSpotsOverride: undefined,
  videoFocusOverride: undefined,
  sunriseSunsetOptimizationOverride: undefined,

  needsVisa: false,
  visaOnArrival: false,
  visaNotes: '',
};

export interface Chat {
  id: string;
  title: string;
  destination: string;
  budget: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;

  // Trip Context
  tripContext: TripContext;
  tripSetupComplete: boolean;

  // Map
  mapPins: MapPin[];
  mapCenter?: [number, number]; // [lng, lat]
  mapZoom?: number;

  // Extracted locations from AI responses (persisted for "Add to Map" buttons)
  extractedLocations: MessageLocations;

  // Costs
  tripCosts: TripCosts;
  touristTraps: TouristTrap[];

  // Bucket List & Packing
  bucketList: BucketListItem[];
  packingList: PackingList;

  // Events & Happenings
  eventsData: EventsData;

  // Conversation Variables (learned from chat)
  conversationVariables: ConversationVariables;
}

interface ChatsContextType {
  chats: Chat[];
  activeChat: Chat | null;
  activeChatId: string | null;
  createChat: (title?: string) => Chat;
  deleteChat: (id: string) => void;
  setActiveChat: (id: string) => void;
  updateChat: (id: string, updates: Partial<Omit<Chat, 'id' | 'createdAt'>>) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateTripContext: (chatId: string, updates: Partial<TripContext>) => void;
  markTripSetupComplete: (chatId: string) => void;
  // Map functions
  addMapPin: (chatId: string, pin: Omit<MapPin, 'id' | 'createdAt'>) => void;
  addMapPins: (chatId: string, pins: Omit<MapPin, 'id' | 'createdAt'>[]) => void;
  removeMapPin: (chatId: string, pinId: string) => void;
  clearMapPins: (chatId: string) => void;
  updateMapView: (chatId: string, center: [number, number], zoom?: number) => void;
  // Extracted locations functions (for "Add to Map" buttons)
  setExtractedLocations: (chatId: string, messageIndex: number, locations: ExtractedLocation[]) => void;
  // Cost functions
  addCostItem: (chatId: string, item: Omit<CostItem, 'id'>) => void;
  addCostItems: (chatId: string, items: Omit<CostItem, 'id'>[]) => void;
  updateCostItem: (chatId: string, itemId: string, updates: Partial<CostItem>) => void;
  removeCostItem: (chatId: string, itemId: string) => void;
  clearCostItems: (chatId: string) => void;
  addTouristTrap: (chatId: string, trap: Omit<TouristTrap, 'id'>) => void;
  removeTouristTrap: (chatId: string, trapId: string) => void;
  // Bucket list functions
  addBucketListItem: (chatId: string, item: Omit<BucketListItem, 'id' | 'createdAt'>) => void;
  updateBucketListItem: (chatId: string, itemId: string, updates: Partial<BucketListItem>) => void;
  removeBucketListItem: (chatId: string, itemId: string) => void;
  toggleBucketListItem: (chatId: string, itemId: string) => void;
  // Packing list functions
  setPackingList: (chatId: string, items: Omit<PackingItem, 'id'>[]) => void;
  updatePackingItem: (chatId: string, itemId: string, updates: Partial<PackingItem>) => void;
  togglePackingItem: (chatId: string, itemId: string) => void;
  clearPackingList: (chatId: string) => void;
  // Events functions
  setEvents: (chatId: string, events: Omit<TripEvent, 'id' | 'isInterested' | 'createdAt'>[], travelAdvisory: string) => void;
  addEvents: (chatId: string, events: Omit<TripEvent, 'id' | 'isInterested' | 'createdAt'>[], travelAdvisory?: string) => void;
  toggleEventInterest: (chatId: string, eventId: string) => void;
  clearEvents: (chatId: string) => void;
  // Conversation variables functions
  updateConversationVariables: (chatId: string, variables: Partial<ConversationVariables>) => void;
  mergeConversationVariables: (chatId: string, newVars: Partial<ConversationVariables>) => void;
  clearConversationVariables: (chatId: string) => void;
}

const ChatsContext = createContext<ChatsContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'tbp-chats';

// Get user-specific storage key
function getStorageKey(userId: string | null | undefined): string {
  if (!userId) return STORAGE_KEY_PREFIX; // Fallback for unauthenticated state
  return `${STORAGE_KEY_PREFIX}-${userId}`;
}

function generateId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generatePinId(): string {
  return `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateCostId(): string {
  return `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateTrapId(): string {
  return `trap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateBucketId(): string {
  return `bucket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generatePackingId(): string {
  return `pack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function generateEventId(): string {
  return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createNewChat(title?: string): Chat {
  const now = Date.now();
  return {
    id: generateId(),
    title: title || 'New Trip',
    destination: 'General',
    budget: 'Broke Backpacker',
    messages: [
      { role: 'assistant', content: "Hey! Sierra here. Where are we heading today? Tell me about your trip and I'll help you plan something epic!" }
    ],
    createdAt: now,
    updatedAt: now,
    tripContext: { ...defaultTripContext },
    tripSetupComplete: false,
    mapPins: [],
    mapCenter: undefined,
    mapZoom: undefined,
    extractedLocations: {},
    tripCosts: { ...defaultTripCosts },
    touristTraps: [],
    bucketList: [],
    packingList: { ...defaultPackingList },
    eventsData: { ...defaultEventsData },
    conversationVariables: { ...defaultConversationVariables },
  };
}

export function ChatsProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load chats from localStorage for the current user
  const loadChatsForUser = (uid: string | null | undefined) => {
    const storageKey = getStorageKey(uid);
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.chats && parsed.chats.length > 0) {
          // Migrate old chats to have tripContext, mapPins, costs, bucketList, and packingList
          const migratedChats = parsed.chats.map((chat: Chat) => ({
            ...chat,
            tripContext: chat.tripContext ? { ...defaultTripContext, ...chat.tripContext } : { ...defaultTripContext },
            tripSetupComplete: chat.tripSetupComplete ?? false,
            mapPins: chat.mapPins ?? [],
            mapCenter: chat.mapCenter ?? undefined,
            mapZoom: chat.mapZoom ?? undefined,
            extractedLocations: chat.extractedLocations ?? {},
            tripCosts: chat.tripCosts ?? { ...defaultTripCosts },
            touristTraps: chat.touristTraps ?? [],
            bucketList: chat.bucketList ?? [],
            packingList: chat.packingList ?? { ...defaultPackingList },
            eventsData: chat.eventsData ?? { ...defaultEventsData },
            conversationVariables: chat.conversationVariables ?? { ...defaultConversationVariables },
          }));
          setChats(migratedChats);
          // Ensure activeChatId is valid - if not, use first chat
          const validActiveId = parsed.activeChatId && migratedChats.some((c: Chat) => c.id === parsed.activeChatId)
            ? parsed.activeChatId
            : migratedChats[0].id;
          setActiveChatId(validActiveId);
          return;
        }
      } catch (e) {
        console.error('Failed to parse stored chats:', e);
      }
    }
    // No stored chats or parse error - create initial chat
    const initial = createNewChat();
    setChats([initial]);
    setActiveChatId(initial.id);
  };

  // Load from localStorage on mount and when user changes
  useEffect(() => {
    // Wait for session to be determined (not loading)
    if (status === 'loading') return;

    // Check if user changed
    const userChanged = prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId;
    prevUserIdRef.current = userId;

    if (userChanged || !isLoaded) {
      loadChatsForUser(userId);
      setIsLoaded(true);
    }
  }, [userId, status]);

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded && status !== 'loading') {
      const storageKey = getStorageKey(userId);
      localStorage.setItem(storageKey, JSON.stringify({ chats, activeChatId }));
    }
  }, [chats, activeChatId, isLoaded, userId, status]);

  // Derive activeChat, with auto-recovery if activeChatId is stale
  const activeChat = chats.find(c => c.id === activeChatId) || null;

  // Auto-recover if activeChatId points to a non-existent chat
  useEffect(() => {
    if (isLoaded && chats.length > 0 && !activeChat) {
      setActiveChatId(chats[0].id);
    }
  }, [isLoaded, chats, activeChat]);

  const createChat = (title?: string): Chat => {
    const newChat = createNewChat(title);
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    return newChat;
  };

  const deleteChat = (id: string) => {
    const filtered = chats.filter(c => c.id !== id);

    if (filtered.length === 0) {
      // If no chats left, create a new one
      const newChat = createNewChat();
      setChats([newChat]);
      setActiveChatId(newChat.id);
    } else {
      setChats(filtered);
      // If we deleted the active chat, switch to the first remaining chat
      if (id === activeChatId) {
        setActiveChatId(filtered[0].id);
      }
    }
  };

  const setActiveChat = (id: string) => {
    if (chats.some(c => c.id === id)) {
      setActiveChatId(id);
    }
  };

  const updateChat = (id: string, updates: Partial<Omit<Chat, 'id' | 'createdAt'>>) => {
    setChats(prev => prev.map(chat =>
      chat.id === id
        ? { ...chat, ...updates, updatedAt: Date.now() }
        : chat
    ));
  };

  const addMessage = (chatId: string, message: Message) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? { ...chat, messages: [...chat.messages, message], updatedAt: Date.now() }
        : chat
    ));
  };

  const updateTripContext = (chatId: string, updates: Partial<TripContext>) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            tripContext: { ...chat.tripContext, ...updates },
            updatedAt: Date.now()
          }
        : chat
    ));
  };

  const markTripSetupComplete = (chatId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? { ...chat, tripSetupComplete: true, updatedAt: Date.now() }
        : chat
    ));
  };

  // Map pin management functions
  const addMapPin = (chatId: string, pin: Omit<MapPin, 'id' | 'createdAt'>) => {
    const newPin: MapPin = {
      ...pin,
      id: generatePinId(),
      createdAt: Date.now(),
    };
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? { ...chat, mapPins: [...chat.mapPins, newPin], updatedAt: Date.now() }
        : chat
    ));
  };

  const addMapPins = (chatId: string, pins: Omit<MapPin, 'id' | 'createdAt'>[]) => {
    const newPins: MapPin[] = pins.map(pin => ({
      ...pin,
      id: generatePinId(),
      createdAt: Date.now(),
    }));
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? { ...chat, mapPins: [...chat.mapPins, ...newPins], updatedAt: Date.now() }
        : chat
    ));
  };

  const removeMapPin = (chatId: string, pinId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? { ...chat, mapPins: chat.mapPins.filter(p => p.id !== pinId), updatedAt: Date.now() }
        : chat
    ));
  };

  const clearMapPins = (chatId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? { ...chat, mapPins: [], updatedAt: Date.now() }
        : chat
    ));
  };

  const updateMapView = (chatId: string, center: [number, number], zoom?: number) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? { ...chat, mapCenter: center, mapZoom: zoom ?? chat.mapZoom, updatedAt: Date.now() }
        : chat
    ));
  };

  // Extracted locations management (for "Add to Map" buttons persistence)
  const setExtractedLocations = (chatId: string, messageIndex: number, locations: ExtractedLocation[]) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            extractedLocations: {
              ...chat.extractedLocations,
              [messageIndex]: locations,
            },
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  // Cost management functions
  const addCostItem = (chatId: string, item: Omit<CostItem, 'id'>) => {
    const newItem: CostItem = {
      ...item,
      id: generateCostId(),
    };
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            tripCosts: {
              ...chat.tripCosts,
              items: [...chat.tripCosts.items, newItem],
              lastUpdated: Date.now(),
            },
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  // Helper to normalize name for comparison (lowercase, remove extra spaces)
  const normalizeName = (name: string): string => {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
  };

  // Helper to check if two cost items are similar enough to be considered duplicates
  const isSimilarCost = (existing: CostItem, newItem: Omit<CostItem, 'id'>): boolean => {
    // Must be same category
    if (existing.category !== newItem.category) return false;

    const existingName = normalizeName(existing.name);
    const newName = normalizeName(newItem.name);

    // Check for exact match
    if (existingName === newName) return true;

    // Check if one contains the other (for variations like "Daily Expenses" vs "Daily Expenses (Food, Transport)")
    if (existingName.includes(newName) || newName.includes(existingName)) return true;

    // Check for key word overlap for daily/general expenses
    const dailyKeywords = ['daily', 'expense', 'budget', 'food', 'transport'];
    const existingHasDaily = dailyKeywords.some(kw => existingName.includes(kw));
    const newHasDaily = dailyKeywords.some(kw => newName.includes(kw));
    if (existingHasDaily && newHasDaily && existing.category === 'food') return true;

    // Check for accommodation with same/similar names
    if (existing.category === 'accommodation') {
      // Extract key parts (hostel name, hotel name, etc.)
      const existingWords = existingName.split(' ').filter(w => w.length > 2);
      const newWords = newName.split(' ').filter(w => w.length > 2);
      const overlap = existingWords.filter(w => newWords.includes(w));
      if (overlap.length >= 2) return true; // At least 2 significant words match
    }

    return false;
  };

  const addCostItems = (chatId: string, items: Omit<CostItem, 'id'>[]) => {
    setChats(prev => prev.map(chat => {
      if (chat.id !== chatId) return chat;

      const existingItems = [...chat.tripCosts.items];
      const itemsToAdd: CostItem[] = [];

      for (const newItem of items) {
        // Find existing item that matches
        const existingIndex = existingItems.findIndex(existing => isSimilarCost(existing, newItem));

        if (existingIndex !== -1) {
          // Update existing item - prefer newer values if they seem more complete
          const existing = existingItems[existingIndex];
          existingItems[existingIndex] = {
            ...existing,
            // Keep existing ID
            // Update amount if new one is provided
            amount: newItem.amount || existing.amount,
            // Update quantity if new one is larger (more complete info)
            quantity: newItem.quantity > existing.quantity ? newItem.quantity : existing.quantity,
            // Update unit to match the larger quantity
            unit: newItem.quantity > existing.quantity ? newItem.unit : existing.unit,
            // Prefer longer/more descriptive name
            name: newItem.name.length > existing.name.length ? newItem.name : existing.name,
            // Combine notes if both exist
            notes: newItem.notes && existing.notes
              ? `${existing.notes}; ${newItem.notes}`
              : newItem.notes || existing.notes,
            // Update source if newer
            sourceMessageIndex: newItem.sourceMessageIndex ?? existing.sourceMessageIndex,
          };
        } else {
          // No match found, add as new item
          itemsToAdd.push({
            ...newItem,
            id: generateCostId(),
          });
        }
      }

      return {
        ...chat,
        tripCosts: {
          ...chat.tripCosts,
          items: [...existingItems, ...itemsToAdd],
          lastUpdated: Date.now(),
        },
        updatedAt: Date.now(),
      };
    }));
  };

  const updateCostItem = (chatId: string, itemId: string, updates: Partial<CostItem>) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            tripCosts: {
              ...chat.tripCosts,
              items: chat.tripCosts.items.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
              lastUpdated: Date.now(),
            },
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  const removeCostItem = (chatId: string, itemId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            tripCosts: {
              ...chat.tripCosts,
              items: chat.tripCosts.items.filter(item => item.id !== itemId),
              lastUpdated: Date.now(),
            },
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  const clearCostItems = (chatId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            tripCosts: { ...defaultTripCosts },
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  const addTouristTrap = (chatId: string, trap: Omit<TouristTrap, 'id'>) => {
    const newTrap: TouristTrap = {
      ...trap,
      id: generateTrapId(),
    };
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? { ...chat, touristTraps: [...chat.touristTraps, newTrap], updatedAt: Date.now() }
        : chat
    ));
  };

  const removeTouristTrap = (chatId: string, trapId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? { ...chat, touristTraps: chat.touristTraps.filter(t => t.id !== trapId), updatedAt: Date.now() }
        : chat
    ));
  };

  // Bucket list management functions
  const addBucketListItem = (chatId: string, item: Omit<BucketListItem, 'id' | 'createdAt'>) => {
    const newItem: BucketListItem = {
      ...item,
      id: generateBucketId(),
      createdAt: Date.now(),
    };
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? { ...chat, bucketList: [...chat.bucketList, newItem], updatedAt: Date.now() }
        : chat
    ));
  };

  const updateBucketListItem = (chatId: string, itemId: string, updates: Partial<BucketListItem>) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            bucketList: chat.bucketList.map(item =>
              item.id === itemId ? { ...item, ...updates } : item
            ),
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  const removeBucketListItem = (chatId: string, itemId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? { ...chat, bucketList: chat.bucketList.filter(item => item.id !== itemId), updatedAt: Date.now() }
        : chat
    ));
  };

  const toggleBucketListItem = (chatId: string, itemId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            bucketList: chat.bucketList.map(item =>
              item.id === itemId ? { ...item, completed: !item.completed } : item
            ),
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  // Packing list management functions
  const setPackingList = (chatId: string, items: Omit<PackingItem, 'id'>[]) => {
    const newItems: PackingItem[] = items.map(item => ({
      ...item,
      id: generatePackingId(),
    }));
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            packingList: {
              items: newItems,
              generatedAt: Date.now(),
              lastUpdated: Date.now(),
            },
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  const updatePackingItem = (chatId: string, itemId: string, updates: Partial<PackingItem>) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            packingList: {
              ...chat.packingList,
              items: chat.packingList.items.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
              lastUpdated: Date.now(),
            },
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  const togglePackingItem = (chatId: string, itemId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            packingList: {
              ...chat.packingList,
              items: chat.packingList.items.map(item =>
                item.id === itemId ? { ...item, packed: !item.packed } : item
              ),
              lastUpdated: Date.now(),
            },
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  const clearPackingList = (chatId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            packingList: { ...defaultPackingList },
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  // Events management functions
  const setEvents = (chatId: string, events: Omit<TripEvent, 'id' | 'isInterested' | 'createdAt'>[], travelAdvisory: string) => {
    const now = Date.now();
    const newEvents: TripEvent[] = events.map(event => ({
      ...event,
      id: generateEventId(),
      isInterested: false,
      createdAt: now,
    }));
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            eventsData: {
              events: newEvents,
              travelAdvisory,
              lastFetched: now,
            },
            updatedAt: now,
          }
        : chat
    ));
  };

  const addEvents = (chatId: string, events: Omit<TripEvent, 'id' | 'isInterested' | 'createdAt'>[], travelAdvisory?: string) => {
    const now = Date.now();
    setChats(prev => prev.map(chat => {
      if (chat.id !== chatId) return chat;

      const existingEvents = chat.eventsData?.events || [];
      const existingNames = new Set(existingEvents.map(e => e.name.toLowerCase()));

      // Filter out duplicates by name and add only new events
      const newEvents: TripEvent[] = events
        .filter(event => !existingNames.has(event.name.toLowerCase()))
        .map(event => ({
          ...event,
          id: generateEventId(),
          isInterested: false,
          createdAt: now,
        }));

      return {
        ...chat,
        eventsData: {
          events: [...existingEvents, ...newEvents],
          travelAdvisory: travelAdvisory || chat.eventsData?.travelAdvisory || '',
          lastFetched: now,
        },
        updatedAt: now,
      };
    }));
  };

  const toggleEventInterest = (chatId: string, eventId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            eventsData: {
              ...chat.eventsData,
              events: chat.eventsData.events.map(event =>
                event.id === eventId ? { ...event, isInterested: !event.isInterested } : event
              ),
            },
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  const clearEvents = (chatId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            eventsData: { ...defaultEventsData },
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  // Conversation variables management functions
  const updateConversationVariables = (chatId: string, variables: Partial<ConversationVariables>) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            conversationVariables: {
              ...chat.conversationVariables,
              ...variables,
              lastUpdated: Date.now(),
            },
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  // Merge new variables with existing (deduplicate arrays, merge customNotes)
  const mergeConversationVariables = (chatId: string, newVars: Partial<ConversationVariables>) => {
    setChats(prev => prev.map(chat => {
      if (chat.id !== chatId) return chat;

      const existing = chat.conversationVariables;
      const merged: ConversationVariables = {
        // Merge arrays with deduplication
        placesDiscussed: [...new Set([...existing.placesDiscussed, ...(newVars.placesDiscussed || [])])],
        placesToAvoid: [...new Set([...existing.placesToAvoid, ...(newVars.placesToAvoid || [])])],
        activityPreferences: [...new Set([...existing.activityPreferences, ...(newVars.activityPreferences || [])])],
        foodPreferences: [...new Set([...existing.foodPreferences, ...(newVars.foodPreferences || [])])],
        accommodationNotes: [...new Set([...existing.accommodationNotes, ...(newVars.accommodationNotes || [])])],
        mustDoActivities: [...new Set([...existing.mustDoActivities, ...(newVars.mustDoActivities || [])])],
        concerns: [...new Set([...existing.concerns, ...(newVars.concerns || [])])],
        budgetNotes: [...new Set([...existing.budgetNotes, ...(newVars.budgetNotes || [])])],

        // Override strings if new value is non-empty
        travelCompanions: newVars.travelCompanions || existing.travelCompanions,
        pacePreference: newVars.pacePreference || existing.pacePreference,

        // Merge custom notes
        customNotes: { ...existing.customNotes, ...(newVars.customNotes || {}) },

        lastUpdated: Date.now(),
      };

      return {
        ...chat,
        conversationVariables: merged,
        updatedAt: Date.now(),
      };
    }));
  };

  const clearConversationVariables = (chatId: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? {
            ...chat,
            conversationVariables: { ...defaultConversationVariables },
            updatedAt: Date.now(),
          }
        : chat
    ));
  };

  // Don't render children until initial load is complete
  if (!isLoaded) {
    return null;
  }

  return (
    <ChatsContext.Provider value={{
      chats,
      activeChat,
      activeChatId,
      createChat,
      deleteChat,
      setActiveChat,
      updateChat,
      addMessage,
      updateTripContext,
      markTripSetupComplete,
      addMapPin,
      addMapPins,
      removeMapPin,
      clearMapPins,
      updateMapView,
      setExtractedLocations,
      addCostItem,
      addCostItems,
      updateCostItem,
      removeCostItem,
      clearCostItems,
      addTouristTrap,
      removeTouristTrap,
      addBucketListItem,
      updateBucketListItem,
      removeBucketListItem,
      toggleBucketListItem,
      setPackingList,
      updatePackingItem,
      togglePackingItem,
      clearPackingList,
      setEvents,
      addEvents,
      toggleEventInterest,
      clearEvents,
      updateConversationVariables,
      mergeConversationVariables,
      clearConversationVariables,
    }}>
      {children}
    </ChatsContext.Provider>
  );
}

export function useChats() {
  const context = useContext(ChatsContext);
  if (context === undefined) {
    throw new Error('useChats must be used within a ChatsProvider');
  }
  return context;
}
