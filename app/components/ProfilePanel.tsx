"use client";

import { useState, useRef, useEffect } from 'react';
import { X, User, MapPin, Heart, AlertCircle, Compass, Plus, ChevronDown, ChevronRight, Backpack, DollarSign, Shield, Camera, Utensils, Gauge, Info } from 'lucide-react';
import { useProfile, UserProfile, ActivityWeighting } from '../context/ProfileContext';
import { useTranslations } from '../context/LocaleContext';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

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

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Collapsible Section Component
function Section({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: typeof User;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-stone-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-stone-800/50 hover:bg-stone-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-orange-500" />
          <span className="text-sm font-bold text-stone-200">{title}</span>
        </div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 border-t border-stone-700">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Toggle Button Component
function ToggleButton({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={clsx(
        "flex items-center justify-between w-full p-2 rounded-lg text-sm transition-colors",
        value ? "bg-orange-600/20 border border-orange-500" : "bg-stone-800 border border-stone-700"
      )}
    >
      <span>{label}</span>
      <div className={clsx(
        "w-10 h-5 rounded-full transition-colors relative",
        value ? "bg-orange-500" : "bg-stone-600"
      )}>
        <div className={clsx(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform",
          value ? "translate-x-5" : "translate-x-0.5"
        )} />
      </div>
    </button>
  );
}

// Enum Selector Component
function EnumSelector<T extends string>({ value, onChange, options, labels }: {
  value: T;
  onChange: (v: T) => void;
  options: T[];
  labels?: Record<T, string>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            value === opt
              ? "bg-orange-600 text-white"
              : "bg-stone-800 border border-stone-700 hover:border-stone-600"
          )}
        >
          {labels?.[opt] || opt.replace(/_/g, ' ')}
        </button>
      ))}
    </div>
  );
}

// Slider Component
function Slider({ value, onChange, label, min = 0, max = 100 }: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-stone-400">{label}</span>
        <span className="text-orange-400">{value}%</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
      />
    </div>
  );
}

// Tooltip Component - Uses fixed positioning with boundary detection
function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, arrowOffset: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipWidth = 256; // w-64 = 16rem = 256px
  const padding = 12; // Padding from screen edge

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;

      // Calculate ideal center position
      let left = rect.left + rect.width / 2;
      let arrowOffset = 0;

      // Check if tooltip would go off the right edge
      const rightEdge = left + tooltipWidth / 2;
      if (rightEdge > screenWidth - padding) {
        const overflow = rightEdge - (screenWidth - padding);
        left = left - overflow;
        arrowOffset = overflow; // Move arrow to compensate
      }

      // Check if tooltip would go off the left edge
      const leftEdge = left - tooltipWidth / 2;
      if (leftEdge < padding) {
        const overflow = padding - leftEdge;
        left = left + overflow;
        arrowOffset = -overflow; // Move arrow to compensate
      }

      setPosition({
        top: rect.top - 8,
        left: left,
        arrowOffset: arrowOffset,
      });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setShow(true);
  };

  return (
    <>
      <div className="relative inline-block" ref={triggerRef}>
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={() => setShow(false)}
          onClick={() => { updatePosition(); setShow(!show); }}
        >
          {children}
        </div>
      </div>
      {show && typeof document !== 'undefined' && (
        <div
          className="fixed z-[9999] px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-xs text-stone-300 w-64 shadow-lg pointer-events-none"
          style={{
            top: position.top,
            left: position.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {content}
          <div
            className="absolute top-full border-4 border-transparent border-t-stone-600"
            style={{
              left: `calc(50% + ${position.arrowOffset}px)`,
              transform: 'translateX(-50%)',
            }}
          />
        </div>
      )}
    </>
  );
}

// Autocomplete Input Component
function AutocompleteInput({ value, onChange, onSelect, suggestions, placeholder, existingTags }: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  suggestions: string[];
  placeholder: string;
  existingTags: string[];
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = value.length > 0
    ? suggestions.filter(s =>
        s.toLowerCase().startsWith(value.toLowerCase()) &&
        !existingTags.includes(s)
      ).slice(0, 8)
    : [];

  const handleSelect = (suggestion: string) => {
    onSelect(suggestion);
    onChange('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSuggestions.length > 0) {
        handleSelect(filteredSuggestions[0]);
      } else if (value.trim()) {
        onSelect(value.trim());
        onChange('');
      }
    }
  };

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500 transition-colors"
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filteredSuggestions.map(suggestion => (
            <button
              key={suggestion}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(suggestion)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-stone-700 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilePanel({ isOpen, onClose }: ProfilePanelProps) {
  const { profile, updateProfile } = useProfile();
  const t = useTranslations('profile');
  const tAuth = useTranslations('auth');

  // Local state for text inputs
  const [localName, setLocalName] = useState(profile.name || '');
  const [localOrigin, setLocalOrigin] = useState(profile.countryOfOrigin || '');
  const [localPassport, setLocalPassport] = useState(profile.passportCountry || '');
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showPassportSuggestions, setShowPassportSuggestions] = useState(false);
  const [countryInput, setCountryInput] = useState('');
  const [bucketInput, setBucketInput] = useState('');
  const [interestInput, setInterestInput] = useState('');
  const [restrictionInput, setRestrictionInput] = useState('');
  const [localBudget, setLocalBudget] = useState(String(profile.monthlyBudget || 1500));

  // Sync local state with profile when panel opens
  useEffect(() => {
    if (isOpen) {
      setLocalName(profile.name || '');
      setLocalOrigin(profile.countryOfOrigin || '');
      setLocalPassport(profile.passportCountry || '');
      setLocalBudget(String(profile.monthlyBudget || 1500));
    }
  }, [isOpen, profile]);

  const handleTextBlur = (field: keyof UserProfile, localValue: string) => {
    if (localValue !== profile[field]) {
      updateProfile({ [field]: localValue });
    }
  };

  const handleBudgetBlur = () => {
    const num = parseInt(localBudget) || 1500;
    if (num !== profile.monthlyBudget) {
      updateProfile({ monthlyBudget: num });
    }
  };

  const filteredOriginSuggestions = (localOrigin?.length || 0) > 0
    ? COUNTRIES.filter(c => c.toLowerCase().startsWith(localOrigin.toLowerCase())).slice(0, 8)
    : [];

  const filteredPassportSuggestions = (localPassport?.length || 0) > 0
    ? COUNTRIES.filter(c => c.toLowerCase().startsWith(localPassport.toLowerCase())).slice(0, 8)
    : [];

  const handleAddTag = (field: 'countriesVisited' | 'bucketList' | 'interests' | 'restrictions', value: string) => {
    if (value && !profile[field]?.includes(value)) {
      updateProfile({ [field]: [...(profile[field] || []), value] });
    }
  };

  const handleRemoveTag = (field: 'countriesVisited' | 'bucketList' | 'interests' | 'restrictions', tag: string) => {
    updateProfile({ [field]: (profile[field] || []).filter(t => t !== tag) });
  };

  const handleActivityChange = (key: keyof ActivityWeighting, value: number) => {
    updateProfile({
      activityWeighting: { ...(profile.activityWeighting || {}), [key]: value }
    });
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
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-lg bg-stone-900 border-l border-stone-700 z-50 overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b border-stone-800 sticky top-0 bg-stone-900 z-10">
              <h2 className="text-lg font-bold text-orange-500">{t('title')}</h2>
              <button onClick={onClose} className="p-2 hover:bg-stone-800 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* BASIC INFO */}
              <Section title={t('basicInfo')} icon={User} defaultOpen={true}>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold">{t('yourName')}</label>
                    <input
                      type="text"
                      value={localName}
                      onChange={(e) => setLocalName(e.target.value)}
                      onBlur={() => handleTextBlur('name', localName)}
                      placeholder={t('namePlaceholder')}
                      className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="relative">
                    <label className="text-xs text-stone-400 uppercase font-bold">{t('countryOfOrigin')}</label>
                    <input
                      type="text"
                      value={localOrigin}
                      onChange={(e) => { setLocalOrigin(e.target.value); setShowOriginSuggestions(true); }}
                      onFocus={() => setShowOriginSuggestions(true)}
                      onBlur={() => { setTimeout(() => setShowOriginSuggestions(false), 200); handleTextBlur('countryOfOrigin', localOrigin); }}
                      placeholder={t('originPlaceholder')}
                      className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-orange-500"
                    />
                    {showOriginSuggestions && filteredOriginSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredOriginSuggestions.map(country => (
                          <button key={country} type="button" onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setLocalOrigin(country); updateProfile({ countryOfOrigin: country }); setShowOriginSuggestions(false); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-stone-700">
                            {country}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="text-xs text-stone-400 uppercase font-bold">{t('passportCountry')}</label>
                    <input
                      type="text"
                      value={localPassport}
                      onChange={(e) => { setLocalPassport(e.target.value); setShowPassportSuggestions(true); }}
                      onFocus={() => setShowPassportSuggestions(true)}
                      onBlur={() => { setTimeout(() => setShowPassportSuggestions(false), 200); handleTextBlur('passportCountry', localPassport); }}
                      placeholder={t('passportPlaceholder')}
                      className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-orange-500"
                    />
                    {showPassportSuggestions && filteredPassportSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-stone-800 border border-stone-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredPassportSuggestions.map(country => (
                          <button key={country} type="button" onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setLocalPassport(country); updateProfile({ passportCountry: country }); setShowPassportSuggestions(false); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-stone-700">
                            {country}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold">{t('travelStyle')}</label>
                    <EnumSelector
                      value={profile.travelStyle}
                      onChange={(v) => updateProfile({ travelStyle: v })}
                      options={['solo', 'couple', 'group', 'family']}
                      labels={{ solo: t('solo'), couple: t('couple'), group: t('group'), family: t('family') }}
                    />
                  </div>
                </div>
              </Section>

              {/* TRAVEL PREFERENCES */}
              <Section title={t('travelPreferences')} icon={Compass}>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold mb-2 block">{t('riskTolerance')}</label>
                    <EnumSelector
                      value={profile.riskTolerance || 'medium'}
                      onChange={(v) => updateProfile({ riskTolerance: v })}
                      options={['low', 'medium', 'high']}
                      labels={{ low: `🛡️ ${t('playItSafe')}`, medium: `⚖️ ${t('balanced')}`, high: `🔥 ${t('sendIt')}` }}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold mb-2 block">{t('comfortThreshold')}</label>
                    <EnumSelector
                      value={profile.comfortThreshold || 'hostels'}
                      onChange={(v) => updateProfile({ comfortThreshold: v })}
                      options={['hotels', 'hostels', 'tents', 'van', 'couchsurfing']}
                      labels={{ hotels: t('hotels'), hostels: t('hostels'), tents: t('tents'), van: t('van'), couchsurfing: t('couchsurfing') }}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold mb-2 block">{t('travelPace')}</label>
                    <EnumSelector
                      value={profile.travelPace || 'moderate'}
                      onChange={(v) => updateProfile({ travelPace: v })}
                      options={['slow', 'moderate', 'fast']}
                      labels={{ slow: `🐢 ${t('slow')}`, moderate: `🚶 ${t('moderate')}`, fast: `🏃 ${t('fast')}` }}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold mb-2 block">{t('restrictions')}</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={restrictionInput}
                        onChange={(e) => setRestrictionInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && restrictionInput.trim()) { handleAddTag('restrictions', restrictionInput.trim()); setRestrictionInput(''); } }}
                        placeholder={t('restrictionsPlaceholder')}
                        className="flex-1 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                      />
                      <button type="button" onClick={() => { if (restrictionInput.trim()) { handleAddTag('restrictions', restrictionInput.trim()); setRestrictionInput(''); } }}
                        className="bg-stone-700 hover:bg-stone-600 p-2 rounded"><Plus size={16} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(profile.restrictions || []).map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 bg-stone-800 border border-stone-700 text-xs px-2 py-1 rounded-full">
                          {tag}
                          <button type="button" onClick={() => handleRemoveTag('restrictions', tag)} className="hover:text-red-400"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              {/* ACTIVITY WEIGHTING */}
              <Section title={t('activityPreferences')} icon={Gauge}>
                <div className="space-y-3">
                  <p className="text-xs text-stone-500">{t('adjustSliders')}</p>
                  <Slider label={`🎉 ${t('partyNightlife')}`} value={profile.activityWeighting?.party || 20} onChange={(v) => handleActivityChange('party', v)} />
                  <Slider label={`🌿 ${t('natureOutdoors')}`} value={profile.activityWeighting?.nature || 30} onChange={(v) => handleActivityChange('nature', v)} />
                  <Slider label={`🏛️ ${t('cultureHistory')}`} value={profile.activityWeighting?.culture || 25} onChange={(v) => handleActivityChange('culture', v)} />
                  <Slider label={`🧗 ${t('adventureAdrenaline')}`} value={profile.activityWeighting?.adventure || 15} onChange={(v) => handleActivityChange('adventure', v)} />
                  <Slider label={`🏖️ ${t('relaxationBeach')}`} value={profile.activityWeighting?.relaxation || 10} onChange={(v) => handleActivityChange('relaxation', v)} />
                </div>
              </Section>

              {/* FOOD & GEAR */}
              <Section title={t('foodAndGear')} icon={Utensils}>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold mb-2 block">{t('foodPreference')}</label>
                    <EnumSelector
                      value={profile.foodPreference || 'street_food'}
                      onChange={(v) => updateProfile({ foodPreference: v })}
                      options={['street_food', 'restaurants', 'cooking', 'mixed']}
                      labels={{ street_food: `🍜 ${t('streetFood')}`, restaurants: `🍽️ ${t('restaurants')}`, cooking: `🍳 ${t('cooking')}`, mixed: `🔀 ${t('mixed')}` }}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold mb-2 block">{t('packWeight')}</label>
                    <EnumSelector
                      value={profile.packWeight || 'moderate'}
                      onChange={(v) => updateProfile({ packWeight: v })}
                      options={['minimalist', 'moderate', 'maximalist']}
                      labels={{ minimalist: `🎒 ${t('minimalist')}`, moderate: `🧳 ${t('moderatePack')}`, maximalist: `💼 ${t('maximalist')}` }}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold mb-2 block">{t('electronicsNeeds')}</label>
                    <EnumSelector
                      value={profile.electronicsTolerance || 'medium'}
                      onChange={(v) => updateProfile({ electronicsTolerance: v })}
                      options={['low', 'medium', 'high']}
                      labels={{ low: `📵 ${t('minimal')}`, medium: `📱 ${t('phoneLaptop')}`, high: `🎬 ${t('creatorKit')}` }}
                    />
                  </div>
                </div>
              </Section>

              {/* BUDGET */}
              <Section title={t('budgetAndIncome')} icon={DollarSign}>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold mb-2 block">{t('budgetStyle')}</label>
                    <div className="space-y-2">
                      {([
                        { value: 'broke-backpacker' as const, label: t('brokeBackpacker'), emoji: '💸', tooltip: tAuth('brokeBackpackerTooltip') },
                        { value: 'flashpacker' as const, label: t('flashpacker'), emoji: '💳', tooltip: tAuth('flashpackerTooltip') },
                        { value: 'digital-nomad' as const, label: t('digitalNomad'), emoji: '💻', tooltip: tAuth('digitalNomadTooltip') },
                      ]).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateProfile({ budgetPreference: opt.value })}
                          className={clsx(
                            "w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors border text-left flex items-center gap-2",
                            profile.budgetPreference === opt.value
                              ? "bg-orange-600 border-orange-500 text-white"
                              : "bg-stone-800 border-stone-700 hover:border-stone-600"
                          )}
                        >
                          <span>{opt.emoji}</span>
                          <span className="flex-1">{opt.label}</span>
                          <Tooltip content={opt.tooltip}>
                            <Info size={14} className={clsx(
                              "cursor-help",
                              profile.budgetPreference === opt.value ? "text-white/70" : "text-stone-400"
                            )} />
                          </Tooltip>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold mb-2 block">{t('incomeType')}</label>
                    <EnumSelector
                      value={profile.incomeType || 'savings_only'}
                      onChange={(v) => updateProfile({ incomeType: v })}
                      options={['remote_worker', 'seasonal_worker', 'savings_only', 'passive_income']}
                      labels={{ remote_worker: `💻 ${t('remoteWorker')}`, seasonal_worker: `🌾 ${t('seasonalWorker')}`, savings_only: `🏦 ${t('savingsOnly')}`, passive_income: `📈 ${t('passiveIncome')}` }}
                    />
                  </div>

                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold">{t('monthlyBudget')}</label>
                    <input
                      type="number"
                      value={localBudget}
                      onChange={(e) => setLocalBudget(e.target.value)}
                      onBlur={handleBudgetBlur}
                      className="w-full bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </Section>

              {/* SAFETY */}
              <Section title={t('safetyPreferences')} icon={Shield}>
                <div className="space-y-3">
                  <ToggleButton
                    value={profile.walkAtNight ?? true}
                    onChange={(v) => updateProfile({ walkAtNight: v })}
                    label={t('comfortableNightWalking')}
                  />
                  <ToggleButton
                    value={profile.experiencedMotos ?? false}
                    onChange={(v) => updateProfile({ experiencedMotos: v })}
                    label={t('experiencedMotorbikes')}
                  />
                  <ToggleButton
                    value={profile.openToCouchsurfing ?? false}
                    onChange={(v) => updateProfile({ openToCouchsurfing: v })}
                    label={t('openToCouchsurfing')}
                  />
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <ToggleButton
                        value={profile.femaleTravelerConcerns ?? false}
                        onChange={(v) => updateProfile({ femaleTravelerConcerns: v })}
                        label={t('femaleTravelerConcerns')}
                      />
                    </div>
                    <Tooltip content={t('femaleTravelerTooltip')}>
                      <Info size={16} className="text-stone-400 cursor-help" />
                    </Tooltip>
                  </div>
                </div>
              </Section>

              {/* CONTENT CREATION */}
              <Section title={t('contentCreation')} icon={Camera}>
                <div className="space-y-3">
                  <ToggleButton
                    value={profile.instagramFriendly ?? false}
                    onChange={(v) => updateProfile({ instagramFriendly: v })}
                    label={t('prioritizeInstagram')}
                  />
                  <ToggleButton
                    value={profile.hiddenSpots ?? true}
                    onChange={(v) => updateProfile({ hiddenSpots: v })}
                    label={t('showHiddenGems')}
                  />
                  <ToggleButton
                    value={profile.videoFocus ?? false}
                    onChange={(v) => updateProfile({ videoFocus: v })}
                    label={t('focusVideo')}
                  />
                </div>
              </Section>

              {/* TRAVEL HISTORY */}
              <Section title={t('travelHistoryDreams')} icon={MapPin}>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold mb-2 block">{t('countriesVisited')}</label>
                    <div className="flex gap-2 mb-2">
                      <AutocompleteInput
                        value={countryInput}
                        onChange={setCountryInput}
                        onSelect={(v) => { handleAddTag('countriesVisited', v); setCountryInput(''); }}
                        suggestions={COUNTRIES}
                        placeholder={t('addCountry')}
                        existingTags={profile.countriesVisited || []}
                      />
                      <button type="button" onClick={() => { if (countryInput.trim()) { handleAddTag('countriesVisited', countryInput.trim()); setCountryInput(''); } }}
                        className="bg-stone-700 hover:bg-stone-600 p-2 rounded"><Plus size={16} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(profile.countriesVisited || []).map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 bg-stone-800 border border-stone-700 text-xs px-2 py-1 rounded-full">
                          {tag}
                          <button type="button" onClick={() => handleRemoveTag('countriesVisited', tag)} className="hover:text-red-400"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold mb-2 block">{t('bucketList')}</label>
                    <div className="flex gap-2 mb-2">
                      <AutocompleteInput
                        value={bucketInput}
                        onChange={setBucketInput}
                        onSelect={(v) => { handleAddTag('bucketList', v); setBucketInput(''); }}
                        suggestions={COUNTRIES}
                        placeholder={t('dreamDestinations')}
                        existingTags={profile.bucketList || []}
                      />
                      <button type="button" onClick={() => { if (bucketInput.trim()) { handleAddTag('bucketList', bucketInput.trim()); setBucketInput(''); } }}
                        className="bg-stone-700 hover:bg-stone-600 p-2 rounded"><Plus size={16} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(profile.bucketList || []).map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 bg-stone-800 border border-stone-700 text-xs px-2 py-1 rounded-full">
                          {tag}
                          <button type="button" onClick={() => handleRemoveTag('bucketList', tag)} className="hover:text-red-400"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-stone-400 uppercase font-bold mb-2 block">{t('interests')}</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={interestInput}
                        onChange={(e) => setInterestInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && interestInput.trim()) { handleAddTag('interests', interestInput.trim()); setInterestInput(''); } }}
                        placeholder={t('interestsPlaceholder')}
                        className="flex-1 bg-stone-800 border border-stone-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500"
                      />
                      <button type="button" onClick={() => { if (interestInput.trim()) { handleAddTag('interests', interestInput.trim()); setInterestInput(''); } }}
                        className="bg-stone-700 hover:bg-stone-600 p-2 rounded"><Plus size={16} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(profile.interests || []).map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 bg-stone-800 border border-stone-700 text-xs px-2 py-1 rounded-full">
                          {tag}
                          <button type="button" onClick={() => handleRemoveTag('interests', tag)} className="hover:text-red-400"><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              {/* Info Note */}
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                <p className="text-xs text-orange-200">
                  {t('profileNote')}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
