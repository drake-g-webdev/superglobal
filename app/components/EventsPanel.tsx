"use client";

import { useState } from 'react';
import {
  CalendarDays, Sparkles, RefreshCw, MapPin, Ticket, Heart,
  Music, PartyPopper, Landmark, ShoppingBag, Trophy, Flag, HelpCircle,
  Loader2, AlertTriangle, ChevronDown, ChevronUp, ListChecks, Check
} from 'lucide-react';
import clsx from 'clsx';
import { useChats, EventType, TripEvent, CostCategory, MapPinType } from '../context/ChatsContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslations } from '../context/LocaleContext';
import { API_URL } from '../config/api';

// Map event type to map pin type
const eventTypeToMapPinType = (eventType: EventType): MapPinType => {
  switch (eventType) {
    case 'festival':
    case 'concert':
      return 'activity';
    case 'market':
      return 'restaurant'; // Markets often have food
    case 'cultural':
    case 'holiday':
      return 'historic';
    case 'sports':
      return 'activity';
    default:
      return 'other';
  }
};

const EVENT_TYPE_CONFIG: Record<EventType, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  festival: { label: 'Festival', icon: PartyPopper, color: '#f97316' },
  concert: { label: 'Concert', icon: Music, color: '#8b5cf6' },
  holiday: { label: 'Holiday', icon: Flag, color: '#ef4444' },
  market: { label: 'Market', icon: ShoppingBag, color: '#22c55e' },
  sports: { label: 'Sports', icon: Trophy, color: '#3b82f6' },
  cultural: { label: 'Cultural', icon: Landmark, color: '#f59e0b' },
  other: { label: 'Other', icon: HelpCircle, color: '#6b7280' },
};

export default function EventsPanel() {
  const { activeChat, setEvents, addEvents, toggleEventInterest, clearEvents, addBucketListItem, addCostItem, addMapPin } = useChats();
  const { profile, isProfileSet } = useProfile();
  const t = useTranslations('events');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvisory, setShowAdvisory] = useState(true);
  const [filter, setFilter] = useState<EventType | 'all' | 'interested'>('all');

  // Check if event is already in bucket list
  const isEventInBucketList = (eventName: string): boolean => {
    if (!activeChat?.bucketList) return false;
    const normalizedName = eventName.toLowerCase();
    return activeChat.bucketList.some(item =>
      item.text.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(item.text.toLowerCase())
    );
  };

  // Map event type to bucket list category
  const eventTypeToBucketCategory = (eventType: EventType): 'experience' | 'food' | 'adventure' | 'culture' | 'photography' | 'other' => {
    switch (eventType) {
      case 'festival':
      case 'concert':
        return 'experience';
      case 'market':
        return 'food';
      case 'sports':
        return 'adventure';
      case 'cultural':
      case 'holiday':
        return 'culture';
      default:
        return 'other';
    }
  };

  // Map event type to cost category
  const eventTypeToCostCategory = (eventType: EventType): CostCategory => {
    switch (eventType) {
      case 'market':
        return 'food';
      default:
        return 'activities';
    }
  };

  // Add event to bucket list, budget, and map
  const handleAddToBucketList = async (event: TripEvent) => {
    if (!activeChat) return;

    // Add to bucket list
    const bucketText = `${event.name}${event.dateRange ? ` (${event.dateRange})` : ''}`;
    addBucketListItem(activeChat.id, {
      text: bucketText,
      completed: false,
      category: eventTypeToBucketCategory(event.eventType),
    });

    // Determine price: use actual price if available, otherwise estimate
    const hasRealPrice = event.estimatedPriceUsd !== null && event.estimatedPriceUsd !== undefined;
    const amount = event.isFree ? 0 : (hasRealPrice ? event.estimatedPriceUsd! : 20);
    const isEstimate = event.isFree ? false : !hasRealPrice;

    // Add to budget
    addCostItem(activeChat.id, {
      category: eventTypeToCostCategory(event.eventType),
      name: event.name,
      amount,
      quantity: 1,
      unit: 'event',
      notes: event.isFree
        ? 'Free event!'
        : hasRealPrice
          ? event.budgetTip || ''
          : `${event.budgetTip || 'Estimate - update with actual cost'}`,
      isEstimate,
    });

    // Add map pin - geocode the event location
    try {
      const geocodeContext = activeChat.destination || event.location;
      const geocodeResponse = await fetch(`${API_URL}/api/geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: event.location,
          context: geocodeContext,
        }),
      });

      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json();
        if (geocodeData.success && geocodeData.coordinates) {
          const coords = geocodeData.coordinates as [number, number];
          addMapPin(activeChat.id, {
            name: event.name,
            type: eventTypeToMapPinType(event.eventType),
            coordinates: coords,
            description: event.description,
            sourceMessageIndex: -1, // Not from a chat message
          });
        }
      }
    } catch (err) {
      console.error('Failed to geocode event location:', err);
      // Don't block adding to bucket list if geocoding fails
    }
  };

  const eventsData = activeChat?.eventsData;
  const events = eventsData?.events || [];
  const travelAdvisory = eventsData?.travelAdvisory || '';
  const interestedCount = events.filter(e => e.isInterested).length;

  // Filter events
  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'interested') return event.isInterested;
    return event.eventType === filter;
  });

  // Just use filtered events (no sorting by rating)
  const sortedEvents = filteredEvents;

  const handleDiscoverEvents = async () => {
    if (!activeChat) return;

    // Check if trip context has dates
    if (!activeChat.tripContext.startDate || !activeChat.tripContext.tripDurationDays) {
      setError('Please set your trip dates in Trip Settings first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calculate end date from start date + duration
      const startDate = new Date(activeChat.tripContext.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + activeChat.tripContext.tripDurationDays);

      // Get interests from profile
      const interests: string[] = [];
      if (isProfileSet) {
        if (profile.interests) interests.push(...profile.interests);
        if (profile.activityWeighting) {
          Object.entries(profile.activityWeighting).forEach(([key, value]) => {
            if (value > 50) interests.push(key);
          });
        }
      }

      const response = await fetch(`${API_URL}/api/discover-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: activeChat.destination,
          start_date: activeChat.tripContext.startDate,
          end_date: endDate.toISOString().split('T')[0],
          interests: interests.slice(0, 5), // Limit to 5 interests
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to discover events');
      }

      const data = await response.json();

      if (data.events && Array.isArray(data.events)) {
        // Map API response to our TripEvent format
        const mappedEvents = data.events.map((e: {
          name: string;
          event_type: string;
          date_range: string;
          location: string;
          description: string;
          is_free: boolean;
          estimated_price_usd: number | null;
          budget_tip: string;
          backpacker_rating: number;
        }) => ({
          name: e.name,
          eventType: e.event_type as EventType,
          dateRange: e.date_range,
          location: e.location,
          description: e.description,
          isFree: e.is_free,
          estimatedPriceUsd: e.estimated_price_usd,
          budgetTip: e.budget_tip,
          backpackerRating: e.backpacker_rating,
        }));

        // If we already have events, add to them instead of replacing
        if (events.length > 0) {
          addEvents(activeChat.id, mappedEvents, data.travel_advisory || undefined);
        } else {
          setEvents(activeChat.id, mappedEvents, data.travel_advisory || '');
        }
      }
    } catch (err) {
      console.error('Error discovering events:', err);
      setError('Failed to discover events. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeChat) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-900 rounded-lg p-4">
        <div className="text-center text-stone-400">
          <CalendarDays size={48} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No trip selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-stone-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-700 bg-stone-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CalendarDays size={18} className="text-orange-500" />
            <span className="font-medium">{t('title')}</span>
          </div>
          {events.length > 0 && (
            <div className="flex items-center gap-2">
              {interestedCount > 0 && (
                <span className="text-xs text-pink-400 bg-pink-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Heart size={10} className="fill-pink-400" />
                  {interestedCount}
                </span>
              )}
              <span className="text-xs text-stone-400 bg-stone-700 px-2 py-0.5 rounded-full">
                {events.length} events
              </span>
              <button
                onClick={() => activeChat && clearEvents(activeChat.id)}
                className="text-stone-500 hover:text-red-400 transition-colors"
                title="Clear events"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Discover Button */}
      <div className="px-4 py-3 border-b border-stone-800">
        <button
          onClick={handleDiscoverEvents}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 disabled:from-stone-600 disabled:to-stone-600 text-white rounded-lg py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {events.length > 0 ? 'Find More Events' : 'Discover Events'}
            </>
          )}
        </button>
        <p className="text-xs text-stone-500 text-center mt-2">
          Find festivals, concerts, and local happenings during your trip
        </p>
        {error && (
          <p className="text-xs text-red-400 text-center mt-2">{error}</p>
        )}
      </div>

      {/* Travel Advisory */}
      {travelAdvisory && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20">
          <button
            onClick={() => setShowAdvisory(!showAdvisory)}
            className="w-full flex items-center justify-between text-amber-400"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} />
              <span className="text-xs font-medium">Travel Advisory</span>
            </div>
            {showAdvisory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showAdvisory && (
            <p className="text-xs text-amber-200/80 mt-2 leading-relaxed">
              {travelAdvisory}
            </p>
          )}
        </div>
      )}

      {/* Filter Tabs */}
      {events.length > 0 && (
        <div className="px-4 py-2 border-b border-stone-800 overflow-x-auto">
          <div className="flex gap-1">
            <button
              onClick={() => setFilter('all')}
              className={clsx(
                "px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors",
                filter === 'all'
                  ? "bg-orange-600 text-white"
                  : "bg-stone-700 text-stone-300 hover:bg-stone-600"
              )}
            >
              All ({events.length})
            </button>
            <button
              onClick={() => setFilter('interested')}
              className={clsx(
                "px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors flex items-center gap-1",
                filter === 'interested'
                  ? "bg-pink-600 text-white"
                  : "bg-stone-700 text-stone-300 hover:bg-stone-600"
              )}
            >
              <Heart size={10} />
              Interested ({interestedCount})
            </button>
            {(Object.keys(EVENT_TYPE_CONFIG) as EventType[]).map(type => {
              const count = events.filter(e => e.eventType === type).length;
              if (count === 0) return null;
              const config = EVENT_TYPE_CONFIG[type];
              return (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={clsx(
                    "px-2.5 py-1 rounded-full text-xs whitespace-nowrap transition-colors",
                    filter === type
                      ? "text-white"
                      : "bg-stone-700 text-stone-300 hover:bg-stone-600"
                  )}
                  style={filter === type ? { backgroundColor: config.color } : {}}
                >
                  {config.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="flex-1 overflow-y-auto">
        {sortedEvents.length > 0 ? (
          <div className="divide-y divide-stone-800">
            {sortedEvents.map(event => {
              const config = EVENT_TYPE_CONFIG[event.eventType];
              const Icon = config.icon;

              return (
                <div
                  key={event.id}
                  className={clsx(
                    "p-4 transition-colors",
                    event.isInterested ? "bg-pink-500/5" : "hover:bg-stone-800/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Type Icon */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: config.color + '20' }}
                    >
                      <span style={{ color: config.color }}><Icon size={20} /></span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium text-sm">{event.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: config.color + '20', color: config.color }}
                            >
                              {config.label}
                            </span>
                            {event.isFree ? (
                              <span className="text-xs text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded">
                                FREE
                              </span>
                            ) : event.estimatedPriceUsd !== null && event.estimatedPriceUsd !== undefined && (
                              <span className="text-xs text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                                ~${Math.round(event.estimatedPriceUsd)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Add to Bucket List button */}
                          {isEventInBucketList(event.name) ? (
                            <span
                              className="p-1.5 rounded-full bg-purple-500/20 text-purple-400"
                              title="Added to bucket list"
                            >
                              <Check size={16} />
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAddToBucketList(event)}
                              className="p-1.5 rounded-full hover:bg-stone-700 text-stone-500 transition-colors"
                              title="Add to bucket list"
                            >
                              <ListChecks size={16} />
                            </button>
                          )}
                          {/* Interest/Heart button */}
                          <button
                            onClick={() => activeChat && toggleEventInterest(activeChat.id, event.id)}
                            className={clsx(
                              "p-1.5 rounded-full transition-colors",
                              event.isInterested
                                ? "bg-pink-500/20 text-pink-400"
                                : "hover:bg-stone-700 text-stone-500"
                            )}
                            title={event.isInterested ? "Remove interest" : "Mark as interested"}
                          >
                            <Heart
                              size={16}
                              className={event.isInterested ? "fill-pink-400" : ""}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Date & Location */}
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-stone-400">
                        <div className="flex items-center gap-1">
                          <CalendarDays size={12} />
                          <span>{event.dateRange}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin size={12} />
                          <span>{event.location}</span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-stone-400 mt-2 leading-relaxed">
                        {event.description}
                      </p>

                      {/* Budget Tip */}
                      {event.budgetTip && (
                        <div className="flex items-center gap-1.5 text-xs text-green-400 mt-3">
                          <Ticket size={12} />
                          <span>{event.budgetTip}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : events.length > 0 ? (
          /* No matches for filter */
          <div className="p-8 text-center">
            <Heart size={40} className="mx-auto mb-3 text-stone-600" />
            <p className="text-sm text-stone-400 mb-1">No events match this filter</p>
            <p className="text-xs text-stone-500">
              Try a different filter or mark some events as interested
            </p>
          </div>
        ) : (
          /* Empty State */
          <div className="p-8 text-center">
            <CalendarDays size={40} className="mx-auto mb-3 text-stone-600" />
            <p className="text-sm text-stone-400 mb-1">{t('noEvents')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
