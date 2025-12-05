"use client";

import { useState, useEffect } from 'react';
import { X, Plus, Calendar, DollarSign, Compass, ChevronLeft, ChevronRight, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { useChats, TripContext, TransportationStyle, AccommodationStyle, TripGoal, ItineraryStop } from '../context/ChatsContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslations } from '../context/LocaleContext';

// Country list for autocomplete
const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini",
  "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece",
  "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland",
  "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast", "Jamaica", "Japan",
  "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia",
  "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar",
  "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius",
  "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique",
  "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria",
  "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama",
  "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania",
  "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines",
  "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles",
  "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa",
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland",
  "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago",
  "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
  "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela",
  "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

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
  { value: 'hostel_private', label: 'Hostel Private', emoji: '🚪' },
  { value: 'apartment', label: 'Apartment', emoji: '🏢' },
  { value: 'guesthouse', label: 'Guesthouse', emoji: '🏠' },
  { value: 'tent', label: 'Camping', emoji: '⛺' },
  { value: 'van', label: 'Van Life', emoji: '🚐' },
  { value: 'couchsurfing', label: 'Couchsurfing', emoji: '🛋️' },
  { value: 'mixed', label: 'Mixed', emoji: '🔀' },
];

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Dutch',
  'Russian', 'Mandarin', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Thai',
  'Vietnamese', 'Indonesian', 'Tagalog', 'Turkish', 'Polish', 'Swedish'
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
  const { activeChat, updateTripContext, markTripSetupComplete, updateChat } = useChats();
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
  const [transportationStyle, setTransportationStyle] = useState<TransportationStyle>('mixed');
  const [accommodationStyle, setAccommodationStyle] = useState<AccommodationStyle>('hostel_dorm');
  const [dailyBudget, setDailyBudget] = useState('50');
  const [tripDuration, setTripDuration] = useState('14');
  const [startDate, setStartDate] = useState('');
  const [dealBreakers, setDealBreakers] = useState<string[]>([]);
  const [newDealBreaker, setNewDealBreaker] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [tripGoals, setTripGoals] = useState<TripGoal[]>([]);
  const [customGoals, setCustomGoals] = useState<string[]>([]);
  const [newCustomGoal, setNewCustomGoal] = useState('');

  // Load existing trip context when opening
  useEffect(() => {
    if (isOpen && activeChat) {
      const ctx = activeChat.tripContext;
      setDestination(activeChat.destination || '');
      setItinerary(ctx.itineraryBreakdown || []);
      setTransportationStyle(ctx.transportationStyle || 'mixed');
      setAccommodationStyle(ctx.accommodationStyle || 'hostel_dorm');
      setDailyBudget(String(ctx.dailyBudgetTarget || 50));
      setTripDuration(String(ctx.tripDurationDays || 14));
      setStartDate(ctx.startDate || '');
      setDealBreakers(ctx.dealBreakers || []);
      setPreferredLanguage(ctx.preferredLanguage || 'English');
      setTripGoals(ctx.tripGoals || []);
      setCustomGoals(ctx.customGoals || []);
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

  const handleSave = () => {
    // Update chat destination
    updateChat(chatId, { destination: destination || 'General' });

    // Update trip context
    updateTripContext(chatId, {
      itineraryBreakdown: itinerary,
      transportationStyle,
      accommodationStyle,
      dailyBudgetTarget: parseInt(dailyBudget) || 50,
      tripDurationDays: parseInt(tripDuration) || 14,
      startDate: startDate || undefined,
      dealBreakers,
      preferredLanguage,
      tripGoals,
      customGoals,
    });

    markTripSetupComplete(chatId);
    onClose();
  };

  const handleNext = () => {
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
                  placeholder={t('destinationPlaceholder')}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500"
                />
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

              <div>
                <label className="text-xs text-stone-400 uppercase font-bold mb-1 block">{t('preferredLanguage')}</label>
                <select
                  value={preferredLanguage}
                  onChange={(e) => setPreferredLanguage(e.target.value)}
                  className="w-full bg-stone-800 border border-stone-700 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500"
                >
                  {LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <p className="text-xs text-stone-500 mt-1">{t('willCanRespond')}</p>
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
              <div className="bg-stone-800/50 rounded-lg p-4 space-y-3">
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
                  <button
                    type="button"
                    onClick={handleAddStop}
                    className="bg-orange-600 hover:bg-orange-500 px-3 py-2 rounded text-sm font-medium"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {itinerary.length > 0 && (
                <div className="space-y-2">
                  {itinerary.map((stop, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-stone-800 rounded-lg p-3">
                      <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{stop.location}</p>
                        <p className="text-xs text-stone-400">{stop.days} days{stop.notes && ` • ${stop.notes}`}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStop(idx)}
                        className="text-stone-500 hover:text-red-400"
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
                <label className="text-xs text-stone-400 uppercase font-bold mb-3 block">{t('transportationStyle')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {TRANSPORTATION_OPTIONS.map(opt => (
                    <ToggleChip
                      key={opt.value}
                      selected={transportationStyle === opt.value}
                      onClick={() => setTransportationStyle(opt.value)}
                    >
                      {opt.emoji} {opt.label}
                    </ToggleChip>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-stone-400 uppercase font-bold mb-3 block">{t('accommodationStyle')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {ACCOMMODATION_OPTIONS.map(opt => (
                    <ToggleChip
                      key={opt.value}
                      selected={accommodationStyle === opt.value}
                      onClick={() => setAccommodationStyle(opt.value)}
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
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 px-6 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {step === totalSteps - 1 ? (
                  <>
                    <Check size={16} /> {t('saveTrip')}
                  </>
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
