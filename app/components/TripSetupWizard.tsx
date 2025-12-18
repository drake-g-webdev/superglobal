"use client";

import { useState, useEffect } from 'react';
import { X, Plus, Calendar, DollarSign, Compass, ChevronLeft, ChevronRight, Check, Trash2, Users, Minus, GripVertical, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useChats, TripContext, TransportationStyle, AccommodationStyle, TripGoal, ItineraryStop } from '../context/ChatsContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslations } from '../context/LocaleContext';
import { API_URL } from '../config/api';
import { COUNTRIES } from '../lib/countries';

interface TripSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
}

const TRIP_GOALS: { value: TripGoal; label: string; emoji: string }[] = [
  { value: 'surf_progression', label: 'Surf Progression', emoji: '🏄' },
  { value: 'volunteering', label: 'Volunteering', emoji: '🤝' },
  { value: 'trekking_altitude', label: 'Trekking / Altitude', emoji: '🏔️' },
  { value: 'remote_work', label: 'Remote Work', emoji: '💻' },
  { value: 'nightlife', label: 'Nightlife', emoji: '🎉' },
  { value: 'cultural_immersion', label: 'Cultural Immersion', emoji: '🏛️' },
  { value: 'dating_forward', label: 'Meeting People', emoji: '💕' },
  { value: 'cheap_adventure', label: 'Cheap Adventure', emoji: '💸' },
  { value: 'photography', label: 'Photography', emoji: '📸' },
  { value: 'food_mission', label: 'Food Mission', emoji: '🍜' },
  { value: 'spiritual_journey', label: 'Spiritual Journey', emoji: '🧘' },
  { value: 'language_learning', label: 'Language Learning', emoji: '🗣️' },
];

const TRANSPORTATION_OPTIONS: { value: TransportationStyle; label: string; emoji: string }[] = [
  { value: 'bus', label: 'Bus', emoji: '🚌' },
  { value: 'moto', label: 'Motorbike', emoji: '🏍️' },
  { value: 'hitchhike', label: 'Hitchhike', emoji: '👍' },
  { value: 'flights', label: 'Flights', emoji: '✈️' },
  { value: 'train', label: 'Train', emoji: '🚂' },
  { value: 'mixed', label: 'Mixed', emoji: '🔀' },
];

const ACCOMMODATION_OPTIONS: { value: AccommodationStyle; label: string; emoji: string }[] = [
  { value: 'hostel_dorm', label: 'Hostel Dorm', emoji: '🛏️' },
  { value: 'hotel', label: 'Hotel', emoji: '🏨' },
  { value: 'apartment', label: 'Apartment', emoji: '🏢' },
  { value: 'guesthouse', label: 'Guesthouse', emoji: '🏠' },
  { value: 'tent', label: 'Camping', emoji: '⛺' },
  { value: 'van', label: 'Van Life', emoji: '🚐' },
  { value: 'couchsurfing', label: 'Couchsurfing', emoji: '🛋️' },
  { value: 'mixed', label: 'Mixed', emoji: '🔀' },
];

// Step indicator component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: totalSteps }).map((_, idx) => (
        <div
          key={idx}
          className={clsx(
            "w-2.5 h-2.5 rounded-full transition-colors",
            idx === currentStep ? "bg-orange-500" : idx < currentStep ? "bg-orange-500/50" : "bg-stone-700"
          )}
        />
      ))}
    </div>
  );
}

// Toggle chip component
function ToggleChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "px-3 py-2 rounded-lg text-sm font-medium transition-all",
        selected
          ? "bg-orange-600 text-white border-2 border-orange-500"
          : "bg-stone-800 border-2 border-stone-700 hover:border-stone-600"
      )}
    >
      {children}
    </button>
  );
}

export default function TripSetupWizard({ isOpen, onClose, chatId }: TripSetupWizardProps) {
  const { activeChat, updateTripContext, markTripSetupComplete, updateChat, addMapPin, updateMapView } = useChats();
  const { profile } = useProfile();
  const t = useTranslations('tripSetup');
  const tGoals = useTranslations('tripGoals');
  const tCommon = useTranslations('common');
  const tProfile = useTranslations('profile');

  const [step, setStep] = useState(0);
  const totalSteps = 4;

  // Local state for form
  const [destination, setDestination] = useState('');
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryStop[]>([]);
  const [newStop, setNewStop] = useState({ location: '', days: 3, notes: '' });

  // Drag and drop state for itinerary reordering
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [transportationStyles, setTransportationStyles] = useState<TransportationStyle[]>(['mixed']);
  const [accommodationStyles, setAccommodationStyles] = useState<AccommodationStyle[]>(['hostel_dorm']);
  const [dailyBudget, setDailyBudget] = useState('50');
  const [tripDuration, setTripDuration] = useState('14');
  const [startDate, setStartDate] = useState('');
  const [dealBreakers, setDealBreakers] = useState<string[]>([]);
  const [newDealBreaker, setNewDealBreaker] = useState('');
  const [tripGoals, setTripGoals] = useState<TripGoal[]>([]);
  const [customGoals, setCustomGoals] = useState<string[]>([]);
  const [newCustomGoal, setNewCustomGoal] = useState('');
  const [travelerCount, setTravelerCount] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Map profile travel style to default traveler count
  const getDefaultTravelerCount = () => {
    switch (profile.travelStyle) {
      case 'solo': return 1;
      case 'couple': return 2;
      case 'group': return 4;
      case 'family': return 4;
      default: return 1;
    }
  };

  // Load existing trip context when opening
  useEffect(() => {
    if (isOpen && activeChat) {
      const ctx = activeChat.tripContext;
      setDestination(activeChat.destination || '');
      setItinerary(ctx.itineraryBreakdown || []);
      // Handle both old single-value and new array format for backwards compatibility
      const oldTransportStyle = (ctx as { transportationStyle?: TransportationStyle }).transportationStyle;
      const oldAccomStyle = (ctx as { accommodationStyle?: AccommodationStyle }).accommodationStyle;
      setTransportationStyles(ctx.transportationStyles?.length ? ctx.transportationStyles : (oldTransportStyle ? [oldTransportStyle] : ['mixed']));
      setAccommodationStyles(ctx.accommodationStyles?.length ? ctx.accommodationStyles : (oldAccomStyle ? [oldAccomStyle] : ['hostel_dorm']));
      setDailyBudget(String(ctx.dailyBudgetTarget || 50));
      setTripDuration(String(ctx.tripDurationDays || 14));
      setStartDate(ctx.startDate || '');
      setDealBreakers(ctx.dealBreakers || []);
      setTripGoals(ctx.tripGoals || []);
      setCustomGoals(ctx.customGoals || []);
      // Load traveler count from trip context, or default from profile
      setTravelerCount(ctx.travelerCount || getDefaultTravelerCount());
      setStep(0);
    }
  }, [isOpen, activeChat]);

  const filteredDestinations = destination.length > 0
    ? COUNTRIES.filter(c => c.toLowerCase().startsWith(destination.toLowerCase())).slice(0, 8)
    : [];

  const handleAddStop = () => {
    if (newStop.location.trim()) {
      setItinerary([...itinerary, { ...newStop, location: newStop.location.trim() }]);
      setNewStop({ location: '', days: 3, notes: '' });
    }
  };

  const handleRemoveStop = (idx: number) => {
    setItinerary(itinerary.filter((_, i) => i !== idx));
  };

  // Drag and drop handlers for itinerary reordering
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedIdx !== null && draggedIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIdx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    // Reorder the itinerary
    const newItinerary = [...itinerary];
    const [draggedItem] = newItinerary.splice(draggedIdx, 1);
    newItinerary.splice(dropIdx, 0, draggedItem);
    setItinerary(newItinerary);

    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleToggleGoal = (goal: TripGoal) => {
    if (tripGoals.includes(goal)) {
      setTripGoals(tripGoals.filter(g => g !== goal));
    } else {
      setTripGoals([...tripGoals, goal]);
    }
  };

  const handleAddDealBreaker = () => {
    if (newDealBreaker.trim() && !dealBreakers.includes(newDealBreaker.trim())) {
      setDealBreakers([...dealBreakers, newDealBreaker.trim()]);
      setNewDealBreaker('');
    }
  };

  const handleAddCustomGoal = () => {
    if (newCustomGoal.trim() && !customGoals.includes(newCustomGoal.trim())) {
      setCustomGoals([...customGoals, newCustomGoal.trim()]);
      setNewCustomGoal('');
    }
  };

  // Check if destination is a valid country
  const isValidCountry = COUNTRIES.includes(destination);

  const handleSave = async () => {
    setIsSaving(true);

    // Update chat destination (must be a valid country)
    updateChat(chatId, { destination: destination });

    // Update trip context
    updateTripContext(chatId, {
      itineraryBreakdown: itinerary,
      transportationStyles,
      accommodationStyles,
      dailyBudgetTarget: parseInt(dailyBudget) || 50,
      tripDurationDays: parseInt(tripDuration) || 14,
      startDate: startDate || undefined,
      dealBreakers,
      tripGoals,
      customGoals,
      travelerCount,
    });

    // Geocode each itinerary stop and add to map
    if (itinerary.length > 0) {
      let firstCoords: [number, number] | null = null;

      for (let i = 0; i < itinerary.length; i++) {
        const stop = itinerary[i];
        try {
          console.log(`[TripSetup] Geocoding itinerary stop ${i + 1}:`, stop.location);
          const geocodeResponse = await fetch(`${API_URL}/api/geocode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              place_name: stop.location,
              context: destination,
            }),
          });

          if (geocodeResponse.ok) {
            const geocodeData = await geocodeResponse.json();
            if (geocodeData.success && geocodeData.coordinates) {
              const coords = geocodeData.coordinates as [number, number];
              console.log(`[TripSetup] Got coordinates for ${stop.location}:`, coords);

              // Store first coordinates for centering map
              if (!firstCoords) {
                firstCoords = coords;
              }

              // Add as itinerary stop pin
              addMapPin(chatId, {
                name: stop.location,
                type: 'city',
                description: stop.notes || `${stop.days} days`,
                coordinates: coords,
                sourceMessageIndex: -1, // -1 indicates from trip setup, not chat
                isItineraryStop: true,
                itineraryOrder: i,
                days: stop.days,
                notes: stop.notes,
              });
            } else {
              console.warn(`[TripSetup] Could not geocode ${stop.location}:`, geocodeData);
            }
          } else {
            console.error(`[TripSetup] Geocode API error for ${stop.location}:`, geocodeResponse.status);
          }
        } catch (error) {
          console.error(`[TripSetup] Error geocoding ${stop.location}:`, error);
        }
      }

      // Center map on first itinerary stop
      if (firstCoords) {
        updateMapView(chatId, firstCoords, 6); // Zoom out to see multiple stops
      }
    }

    markTripSetupComplete(chatId);
    setIsSaving(false);
    onClose();
  };

  const handleNext = () => {
    // On step 0, require valid country before proceeding
    if (step === 0 && !isValidCountry) {
      return;
    }

    // On step 1 (itinerary), auto-save any pending stop before proceeding
    if (step === 1 && newStop.location.trim()) {
      // Add the pending stop to itinerary
      setItinerary(prev => [...prev, { ...newStop, location: newStop.location.trim() }]);
      setNewStop({ location: '', days: 3, notes: '' });
    }

    if (step < totalSteps - 1) setStep(step + 1);
    else handleSave();
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-orange-500 mb-2">{t('whereHeading')}</h3>
              <p className="text-sm text-stone-400">{t('startWithDestination')}</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <label className="text-xs text-stone-400 uppercase font-bold mb-1 block">{t('mainDestination')}</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => { setDestination(e.target.value); setShowDestinationSuggestions(true); }}
                  onFocus={() => setShowDestinationSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowDestinationSuggestions(false), 200)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && filteredDestinations.length > 0) {
                      e.preventDefault();
                      setDestination(filteredDestinations[0]);
                      setShowDestinationSuggestions(false);
                    }
                  }}
                  placeholder="e.g. Thailand, Peru, Vietnam..."
                  className={clsx(
                    "w-full bg-stone-800 rounded-lg px-4 py-3 focus:outline-none",
                    destination && isValidCountry
                      ? "border-2 border-green-500/50"
                      : destination && !isValidCountry
                      ? "border-2 border-red-500/50"
                      : "border border-stone-700 focus:border-orange-500"
                  )}
                />
                {destination && !isValidCountry && (
                  <p className="text-xs text-red-400 mt-1">Please select a valid country from the list</p>
                )}
                {showDestinationSuggestions && filteredDestinations.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredDestinations.map(country => (
                      <button
                        key={country}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setDestination(country); setShowDestinationSuggestions(false); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-stone-700"
                      >
                        {country}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-stone-400 uppercase font-bold mb-1 block">{t('tripDuration')}</label>
                  <input
                    type="number"
                    value={tripDuration}
                    onChange={(e) => setTripDuration(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-400 uppercase font-bold mb-1 block">{t('startDate')}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-stone-400 uppercase font-bold mb-1 block">{t('dailyBudget')}</label>
                <input
                  type="number"
                  value={dailyBudget}
                  onChange={(e) => setDailyBudget(e.target.value)}
                  placeholder="50"
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Traveler Count */}
              <div>
                <label className="text-xs text-stone-400 uppercase font-bold mb-1 block">Number of Travelers</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center bg-stone-800 border border-stone-700 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setTravelerCount(Math.max(1, travelerCount - 1))}
                      className="px-4 py-3 hover:bg-stone-700 transition-colors disabled:opacity-50"
                      disabled={travelerCount <= 1}
                    >
                      <Minus size={16} />
                    </button>
                    <span className="px-6 py-3 font-bold text-lg min-w-[60px] text-center">{travelerCount}</span>
                    <button
                      type="button"
                      onClick={() => setTravelerCount(travelerCount + 1)}
                      className="px-4 py-3 hover:bg-stone-700 transition-colors"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-400">
                    <Users size={16} className="text-orange-500" />
                    <span>
                      {travelerCount === 1 ? 'Solo' : travelerCount === 2 ? 'Couple/Duo' : `Group of ${travelerCount}`}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-stone-500 mt-1">Affects cost calculations for tickets, flights, food, etc.</p>
              </div>

            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-orange-500 mb-2">{t('buildItinerary')}</h3>
              <p className="text-sm text-stone-400">{t('addStops')}</p>
            </div>

            <div className="space-y-4">
              <div className="bg-stone-800/50 rounded-lg p-4 space-y-3 border border-dashed border-stone-600">
                <input
                  type="text"
                  value={newStop.location}
                  onChange={(e) => setNewStop({ ...newStop, location: e.target.value })}
                  placeholder={t('locationPlaceholder')}
                  className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={newStop.days}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setNewStop({ ...newStop, days: val === '' ? 0 : parseInt(val) });
                    }}
                    placeholder="Days"
                    className="w-16 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm text-center focus:outline-none focus:border-orange-500"
                  />
                  <span className="text-sm text-stone-400 self-center">{t('days')}</span>
                  <input
                    type="text"
                    value={newStop.notes}
                    onChange={(e) => setNewStop({ ...newStop, notes: e.target.value })}
                    placeholder={t('notesOptional')}
                    className="flex-1 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddStop}
                  disabled={!newStop.location.trim()}
                  className={clsx(
                    "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    newStop.location.trim()
                      ? "bg-stone-700 hover:bg-stone-600 text-white border border-stone-600"
                      : "bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-700"
                  )}
                >
                  <Plus size={16} />
                  {itinerary.length > 0 ? 'Add Another Stop' : 'Add Stop'}
                </button>
                {newStop.location.trim() && (
                  <p className="text-xs text-stone-500 text-center mt-1">
                    Or just click Next - your stop will be saved automatically
                  </p>
                )}
              </div>

              {itinerary.length > 0 && (
                <div className="space-y-2">
                  {itinerary.length > 1 && (
                    <p className="text-xs text-stone-500 flex items-center gap-1">
                      <GripVertical size={12} /> Drag to reorder stops
                    </p>
                  )}
                  {itinerary.map((stop, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={clsx(
                        "flex items-center gap-2 bg-stone-800 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all",
                        draggedIdx === idx && "opacity-50 scale-95",
                        dragOverIdx === idx && draggedIdx !== null && draggedIdx < idx && "border-b-2 border-orange-500",
                        dragOverIdx === idx && draggedIdx !== null && draggedIdx > idx && "border-t-2 border-orange-500"
                      )}
                    >
                      <div className="text-stone-500 hover:text-stone-300 cursor-grab">
                        <GripVertical size={16} />
                      </div>
                      <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{stop.location}</p>
                        <p className="text-xs text-stone-400 truncate">{stop.days} days{stop.notes && ` • ${stop.notes}`}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStop(idx)}
                        className="text-stone-500 hover:text-red-400 flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <p className="text-xs text-stone-500 text-right">
                    {t('total')}: {itinerary.reduce((sum, s) => sum + s.days, 0)} {t('days')}
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-orange-500 mb-2">{t('howTraveling')}</h3>
              <p className="text-sm text-stone-400">{t('transportAccommodation')}</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs text-stone-400 uppercase font-bold mb-1 block">{t('transportationStyle')}</label>
                <p className="text-xs text-stone-500 mb-3">Select all that apply</p>
                <div className="grid grid-cols-3 gap-2">
                  {TRANSPORTATION_OPTIONS.filter(opt => opt.value !== 'mixed').map(opt => (
                    <ToggleChip
                      key={opt.value}
                      selected={transportationStyles.includes(opt.value)}
                      onClick={() => {
                        if (transportationStyles.includes(opt.value)) {
                          // Remove if already selected (but keep at least one)
                          if (transportationStyles.length > 1) {
                            setTransportationStyles(transportationStyles.filter(s => s !== opt.value));
                          }
                        } else {
                          // Add to selection (and remove 'mixed' if present)
                          setTransportationStyles([...transportationStyles.filter(s => s !== 'mixed'), opt.value]);
                        }
                      }}
                    >
                      {opt.emoji} {opt.label}
                    </ToggleChip>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-stone-400 uppercase font-bold mb-1 block">{t('accommodationStyle')}</label>
                <p className="text-xs text-stone-500 mb-3">Select all that apply</p>
                <div className="grid grid-cols-2 gap-2">
                  {ACCOMMODATION_OPTIONS.filter(opt => opt.value !== 'mixed').map(opt => (
                    <ToggleChip
                      key={opt.value}
                      selected={accommodationStyles.includes(opt.value)}
                      onClick={() => {
                        if (accommodationStyles.includes(opt.value)) {
                          // Remove if already selected (but keep at least one)
                          if (accommodationStyles.length > 1) {
                            setAccommodationStyles(accommodationStyles.filter(s => s !== opt.value));
                          }
                        } else {
                          // Add to selection (and remove 'mixed' if present)
                          setAccommodationStyles([...accommodationStyles.filter(s => s !== 'mixed'), opt.value]);
                        }
                      }}
                    >
                      {opt.emoji} {opt.label}
                    </ToggleChip>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-stone-400 uppercase font-bold mb-2 block">{t('dealBreakers')}</label>
                <p className="text-xs text-stone-500 mb-2">{t('dealBreakersDesc')}</p>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newDealBreaker}
                    onChange={(e) => setNewDealBreaker(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddDealBreaker()}
                    placeholder={t('dealBreakersPlaceholder')}
                    className="flex-1 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddDealBreaker}
                    className="bg-stone-700 hover:bg-stone-600 p-2 rounded"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {dealBreakers.map(db => (
                    <span key={db} className="inline-flex items-center gap-1 bg-red-900/30 border border-red-500/30 text-xs px-2 py-1 rounded-full">
                      {db}
                      <button type="button" onClick={() => setDealBreakers(dealBreakers.filter(d => d !== db))} className="hover:text-red-400">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-orange-500 mb-2">{t('whatsTheMission')}</h3>
              <p className="text-sm text-stone-400">{t('selectGoals')}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {TRIP_GOALS.map(goal => (
                <ToggleChip
                  key={goal.value}
                  selected={tripGoals.includes(goal.value)}
                  onClick={() => handleToggleGoal(goal.value)}
                >
                  {goal.emoji} {goal.label}
                </ToggleChip>
              ))}
            </div>

            <div>
              <label className="text-xs text-stone-400 uppercase font-bold mb-2 block">{t('customGoals')}</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newCustomGoal}
                  onChange={(e) => setNewCustomGoal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomGoal()}
                  placeholder={t('addYourGoal')}
                  className="flex-1 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomGoal}
                  className="bg-stone-700 hover:bg-stone-600 p-2 rounded"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {customGoals.map(goal => (
                  <span key={goal} className="inline-flex items-center gap-1 bg-orange-900/30 border border-orange-500/30 text-xs px-2 py-1 rounded-full">
                    {goal}
                    <button type="button" onClick={() => setCustomGoals(customGoals.filter(g => g !== goal))} className="hover:text-red-400">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-xl bg-stone-900 rounded-2xl border border-stone-700 z-50 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <Compass className="text-orange-500" size={20} />
                <h2 className="font-bold">{t('title')}</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <StepIndicator currentStep={step} totalSteps={totalSteps} />
              {renderStep()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-stone-800">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 0}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  step === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-stone-800"
                )}
              >
                <ChevronLeft size={16} /> {tCommon('back')}
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={isSaving}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:bg-orange-600/50 px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {step === totalSteps - 1 ? (
                  isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> {t('saveTrip')}
                    </>
                  )
                ) : (
                  <>
                    {tCommon('next')} <ChevronRight size={16} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
