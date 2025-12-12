"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, MapPin, Loader2, AlertCircle, ChevronRight, ChevronLeft, Key, Globe, Info, Compass, Gauge, Utensils, Shield, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SpinningGlobe from '../../components/SpinningGlobe';
import { useProfile, UserProfile, ActivityWeighting, defaultActivityWeighting } from '../../context/ProfileContext';
import { useTranslations, useLocale } from '../../context/LocaleContext';
import clsx from 'clsx';

// Tooltip component - positioned to stay within viewport
function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute z-50 bottom-full right-0 mb-2 px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-xs text-stone-300 w-64 shadow-lg">
          {content}
          <div className="absolute top-full right-4 border-4 border-transparent border-t-stone-600" />
        </div>
      )}
    </div>
  );
}

// Slider component for activity weighting
function Slider({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-stone-400">{label}</span>
        <span className="text-orange-400">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
      />
    </div>
  );
}

// Toggle button component
function ToggleButton({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={clsx(
        "flex items-center justify-between w-full p-2 rounded-lg text-sm transition-colors",
        value ? "bg-orange-600/20 border border-orange-500" : "bg-stone-700 border border-stone-600"
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

const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia",
  "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium",
  "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei",
  "Bulgaria", "Burkina Faso", "Burundi", "Cambodia", "Cameroon", "Canada", "Cape Verde",
  "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic",
  "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada",
  "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary", "Iceland", "India",
  "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
  "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali",
  "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco",
  "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands",
  "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman",
  "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines",
  "Poland", "Portugal", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia",
  "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
  "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname",
  "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
  "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine",
  "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu",
  "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"
];

export default function SignupPage() {
  const router = useRouter();
  const { signup, markProfileComplete } = useAuth();
  const { updateProfile } = useProfile();
  const { locale, setLocale } = useLocale();
  const t = useTranslations('auth');
  const tProfile = useTranslations('profile');
  const tLanguage = useTranslations('language');

  // Total steps: 1-Account, 2-Language, 3-Basic Info, 4-Travel Prefs, 5-Activity, 6-Food&Gear, 7-Safety&Content
  const [step, setStep] = useState(1);
  const totalSteps = 7;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Account details
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [masterPassword, setMasterPassword] = useState('');

  // Step 3: Basic Info
  const [name, setName] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);

  // Step 4: Travel Preferences
  const [riskTolerance, setRiskTolerance] = useState<'low' | 'medium' | 'high'>('medium');
  const [comfortThreshold, setComfortThreshold] = useState<'hotels' | 'hostels' | 'tents' | 'van' | 'couchsurfing'>('hostels');
  const [travelPace, setTravelPace] = useState<'slow' | 'moderate' | 'fast'>('moderate');

  // Step 5: Activity Preferences
  const [activityWeighting, setActivityWeighting] = useState<ActivityWeighting>(defaultActivityWeighting);

  // Step 6: Food & Gear
  const [foodPreference, setFoodPreference] = useState<'street_food' | 'restaurants' | 'cooking' | 'mixed'>('street_food');
  const [packWeight, setPackWeight] = useState<'minimalist' | 'moderate' | 'maximalist'>('moderate');
  const [electronicsTolerance, setElectronicsTolerance] = useState<'low' | 'medium' | 'high'>('medium');

  // Step 6: Food & Gear also includes budget style
  const [budgetPreference, setBudgetPreference] = useState<UserProfile['budgetPreference']>('broke-backpacker');

  // Step 7: Safety & Content Creation - all false by default (no auto-selection)
  const [walkAtNight, setWalkAtNight] = useState(false);
  const [experiencedMotos, setExperiencedMotos] = useState(false);
  const [openToCouchsurfing, setOpenToCouchsurfing] = useState(false);
  const [femaleTravelerConcerns, setFemaleTravelerConcerns] = useState(false);
  const [instagramFriendly, setInstagramFriendly] = useState(false);
  const [hiddenSpots, setHiddenSpots] = useState(false);
  const [videoFocus, setVideoFocus] = useState(false);

  const filteredOriginSuggestions = countryOfOrigin
    ? COUNTRIES.filter(c => c.toLowerCase().includes(countryOfOrigin.toLowerCase())).slice(0, 5)
    : [];

  const validateStep1 = () => {
    if (!email || !password || !confirmPassword || !masterPassword) {
      setError('All fields are required');
      return false;
    }
    const correctMasterPassword = process.env.NEXT_PUBLIC_MASTER_PASSWORD || 'brokepacker2025';
    if (masterPassword !== correctMasterPassword) {
      setError('Invalid master password');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!name.trim()) {
      setError('Name is required');
      return false;
    }
    if (!countryOfOrigin.trim()) {
      setError('Country of origin is required');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1 && !validateStep1()) return;
    if (step === 3 && !validateStep3()) return;
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setError('');
    setStep(step - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Final step - submit everything
    setIsLoading(true);

    try {
      const result = await signup(email, password, name);

      if (!result.ok) {
        setError(result.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      // Build full profile data for local state
      const fullProfileData: Partial<UserProfile> = {
        name,
        countryOfOrigin,
        riskTolerance,
        comfortThreshold,
        travelPace,
        activityWeighting,
        foodPreference,
        packWeight,
        electronicsTolerance,
        budgetPreference,
        walkAtNight,
        experiencedMotos,
        openToCouchsurfing,
        femaleTravelerConcerns,
        instagramFriendly,
        hiddenSpots,
        videoFocus,
      };

      // Save profile data to local state
      updateProfile(fullProfileData);

      // Longer delay to ensure session cookies are fully propagated to server
      console.log('[Signup] Waiting for session cookies to propagate...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Build database profile data (using DB field names)
      const dbProfileData = {
        name,
        countryOfOrigin,
        riskTolerance,
        comfortThreshold: [comfortThreshold],
        travelPace,
        partyWeight: activityWeighting.party,
        natureWeight: activityWeighting.nature,
        cultureWeight: activityWeighting.culture,
        adventureWeight: activityWeighting.adventure,
        relaxationWeight: activityWeighting.relaxation,
        foodPreference,
        packWeight,
        electronicsTolerance,
        budgetStyle: budgetPreference,
        nightWalking: walkAtNight,
        motorbikeOk: experiencedMotos,
        couchsurfingOk: openToCouchsurfing,
        femaleSafety: femaleTravelerConcerns,
        instagramSpots: instagramFriendly,
        hiddenGems: hiddenSpots,
        videoLocations: videoFocus,
      };

      // Sync profile to database with retry logic
      let profileSaved = false;
      console.log('[Signup] About to save profile to database:', {
        countryOfOrigin: dbProfileData.countryOfOrigin,
        riskTolerance: dbProfileData.riskTolerance,
        travelPace: dbProfileData.travelPace,
      });

      for (let attempt = 0; attempt < 3 && !profileSaved; attempt++) {
        try {
          console.log(`[Signup] Profile save attempt ${attempt + 1}...`);
          const profileRes = await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dbProfileData),
            credentials: 'include', // Ensure cookies are sent
          });

          if (profileRes.ok) {
            profileSaved = true;
            const savedProfile = await profileRes.json();
            console.log('[Signup] Profile saved successfully:', savedProfile.id);
          } else {
            const errorData = await profileRes.json().catch(() => ({}));
            console.warn(`[Signup] Profile save attempt ${attempt + 1} failed:`, profileRes.status, errorData);
            if (attempt < 2) {
              // Longer delay between retries to allow cookies to propagate
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (fetchErr) {
          console.warn(`[Signup] Profile save attempt ${attempt + 1} error:`, fetchErr);
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!profileSaved) {
        console.error('[Signup] CRITICAL: Could not save profile to database after 3 attempts');
      }

      // Mark profile as complete
      console.log('[Signup] Marking profile as complete...');
      await markProfileComplete();

      // Give the session a moment to fully update before navigation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Hard redirect to main app - forces full page reload to ensure session is fresh
      console.log('[Signup] Redirecting to /app...');
      window.location.href = '/app';
    } catch (err) {
      console.error('[Signup] Unexpected error:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Render progress dots
  const renderProgress = () => (
    <div className="flex items-center justify-center gap-1 mb-6">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div key={i} className="flex items-center">
          <div className={clsx(
            "w-2.5 h-2.5 rounded-full transition-colors",
            step > i ? "bg-orange-500" : step === i + 1 ? "bg-orange-500" : "bg-stone-700"
          )} />
          {i < totalSteps - 1 && <div className="w-4 h-0.5 bg-stone-700" />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-3">
            <SpinningGlobe size={64} />
          </div>
          <h1 className="text-xl font-bold text-white font-mono">superglobal.travel</h1>
        </div>

        {renderProgress()}

        {/* Form */}
        <div className="bg-stone-800 rounded-2xl p-5 border border-stone-700 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={step === totalSteps ? handleSubmit : (e) => { e.preventDefault(); handleNextStep(); }}>

            {/* STEP 1: Account Details */}
            {step === 1 && (
              <>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User size={20} className="text-orange-500" />
                  Account Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-1">Email</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full bg-stone-700 border border-stone-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-1">Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full bg-stone-700 border border-stone-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="w-full bg-stone-700 border border-stone-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-1">Master Password</label>
                    <div className="relative">
                      <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                      <input
                        type="password"
                        value={masterPassword}
                        onChange={(e) => setMasterPassword(e.target.value)}
                        placeholder="App access code"
                        className="w-full bg-stone-700 border border-stone-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                    <p className="text-xs text-stone-500 mt-1">Required to access the beta</p>
                  </div>
                </div>
              </>
            )}

            {/* STEP 2: Language Selection */}
            {step === 2 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button type="button" onClick={handlePrevStep} className="text-stone-400 hover:text-white transition-colors flex items-center gap-1">
                    <ChevronLeft size={18} /> Back
                  </button>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Globe size={20} className="text-orange-500" />
                    {t('selectLanguage')}
                  </h2>
                  <div className="w-16" />
                </div>

                <p className="text-sm text-stone-400 mb-6 text-center">{t('languageDescription')}</p>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setLocale('en')}
                    className={clsx(
                      "w-full px-4 py-4 rounded-lg text-left flex items-center gap-4 border transition-colors",
                      locale === 'en' ? "bg-orange-600 border-orange-500 text-white" : "bg-stone-700 border-stone-600 hover:border-stone-500"
                    )}
                  >
                    <Globe size={24} />
                    <div>
                      <div className="font-semibold">{tLanguage('english')}</div>
                      <div className="text-sm opacity-75">English</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocale('es')}
                    className={clsx(
                      "w-full px-4 py-4 rounded-lg text-left flex items-center gap-4 border transition-colors",
                      locale === 'es' ? "bg-orange-600 border-orange-500 text-white" : "bg-stone-700 border-stone-600 hover:border-stone-500"
                    )}
                  >
                    <Globe size={24} />
                    <div>
                      <div className="font-semibold">{tLanguage('spanish')}</div>
                      <div className="text-sm opacity-75">Spanish</div>
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* STEP 3: Basic Info */}
            {step === 3 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button type="button" onClick={handlePrevStep} className="text-stone-400 hover:text-white transition-colors flex items-center gap-1">
                    <ChevronLeft size={18} /> Back
                  </button>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <User size={20} className="text-orange-500" />
                    {tProfile('basicInfo')}
                  </h2>
                  <div className="w-16" />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-1">{tProfile('yourName')} *</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={tProfile('namePlaceholder')}
                        className="w-full bg-stone-700 border border-stone-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-1">{tProfile('countryOfOrigin')} *</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                      <input
                        type="text"
                        value={countryOfOrigin}
                        onChange={(e) => { setCountryOfOrigin(e.target.value); setShowOriginSuggestions(true); }}
                        onFocus={() => setShowOriginSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
                        placeholder={tProfile('originPlaceholder')}
                        className="w-full bg-stone-700 border border-stone-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                    {showOriginSuggestions && filteredOriginSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-stone-700 border border-stone-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredOriginSuggestions.map(country => (
                          <button key={country} type="button" onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setCountryOfOrigin(country); setShowOriginSuggestions(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-stone-600">
                            {country}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
              </>
            )}

            {/* STEP 4: Travel Preferences */}
            {step === 4 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button type="button" onClick={handlePrevStep} className="text-stone-400 hover:text-white transition-colors flex items-center gap-1">
                    <ChevronLeft size={18} /> Back
                  </button>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Compass size={20} className="text-orange-500" />
                    {tProfile('travelPreferences')}
                  </h2>
                  <div className="w-16" />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-2">{tProfile('riskTolerance')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'low' as const, label: `🛡️ ${tProfile('playItSafe')}` },
                        { value: 'medium' as const, label: `⚖️ ${tProfile('balanced')}` },
                        { value: 'high' as const, label: `🔥 ${tProfile('sendIt')}` },
                      ]).map(opt => (
                        <button key={opt.value} type="button" onClick={() => setRiskTolerance(opt.value)}
                          className={clsx("px-2 py-2 rounded-lg text-xs font-medium transition-colors border text-center",
                            riskTolerance === opt.value ? "bg-orange-600 border-orange-500 text-white" : "bg-stone-700 border-stone-600 hover:border-stone-500")}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-2">{tProfile('comfortThreshold')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: 'hotels' as const, label: '🏨 Hotels' },
                        { value: 'hostels' as const, label: '🛏️ Hostels' },
                        { value: 'tents' as const, label: '⛺ Camping' },
                        { value: 'couchsurfing' as const, label: '🛋️ Couchsurfing' },
                      ]).map(opt => (
                        <button key={opt.value} type="button" onClick={() => setComfortThreshold(opt.value)}
                          className={clsx("px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
                            comfortThreshold === opt.value ? "bg-orange-600 border-orange-500 text-white" : "bg-stone-700 border-stone-600 hover:border-stone-500")}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-2">{tProfile('travelPace')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'slow' as const, label: `🐢 ${tProfile('slow')}` },
                        { value: 'moderate' as const, label: `🚶 ${tProfile('moderate')}` },
                        { value: 'fast' as const, label: `🏃 ${tProfile('fast')}` },
                      ]).map(opt => (
                        <button key={opt.value} type="button" onClick={() => setTravelPace(opt.value)}
                          className={clsx("px-2 py-2 rounded-lg text-xs font-medium transition-colors border text-center",
                            travelPace === opt.value ? "bg-orange-600 border-orange-500 text-white" : "bg-stone-700 border-stone-600 hover:border-stone-500")}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* STEP 5: Activity Preferences */}
            {step === 5 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button type="button" onClick={handlePrevStep} className="text-stone-400 hover:text-white transition-colors flex items-center gap-1">
                    <ChevronLeft size={18} /> Back
                  </button>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Gauge size={20} className="text-orange-500" />
                    {tProfile('activityPreferences')}
                  </h2>
                  <div className="w-16" />
                </div>

                <p className="text-xs text-stone-500 mb-4">{tProfile('adjustSliders')}</p>

                <div className="space-y-4">
                  <Slider label={`🎉 ${tProfile('partyNightlife')}`} value={activityWeighting.party}
                    onChange={(v) => setActivityWeighting(prev => ({ ...prev, party: v }))} />
                  <Slider label={`🌿 ${tProfile('natureOutdoors')}`} value={activityWeighting.nature}
                    onChange={(v) => setActivityWeighting(prev => ({ ...prev, nature: v }))} />
                  <Slider label={`🏛️ ${tProfile('cultureHistory')}`} value={activityWeighting.culture}
                    onChange={(v) => setActivityWeighting(prev => ({ ...prev, culture: v }))} />
                  <Slider label={`🧗 ${tProfile('adventureAdrenaline')}`} value={activityWeighting.adventure}
                    onChange={(v) => setActivityWeighting(prev => ({ ...prev, adventure: v }))} />
                  <Slider label={`🏖️ ${tProfile('relaxationBeach')}`} value={activityWeighting.relaxation}
                    onChange={(v) => setActivityWeighting(prev => ({ ...prev, relaxation: v }))} />
                </div>
              </>
            )}

            {/* STEP 6: Food & Gear */}
            {step === 6 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button type="button" onClick={handlePrevStep} className="text-stone-400 hover:text-white transition-colors flex items-center gap-1">
                    <ChevronLeft size={18} /> Back
                  </button>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Utensils size={20} className="text-orange-500" />
                    {tProfile('foodAndGear')}
                  </h2>
                  <div className="w-16" />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-2">{tProfile('foodPreference')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: 'street_food' as const, label: `🍜 ${tProfile('streetFood')}` },
                        { value: 'restaurants' as const, label: `🍽️ ${tProfile('restaurants')}` },
                        { value: 'cooking' as const, label: `🍳 ${tProfile('cooking')}` },
                        { value: 'mixed' as const, label: `🔀 ${tProfile('mixed')}` },
                      ]).map(opt => (
                        <button key={opt.value} type="button" onClick={() => setFoodPreference(opt.value)}
                          className={clsx("px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
                            foodPreference === opt.value ? "bg-orange-600 border-orange-500 text-white" : "bg-stone-700 border-stone-600 hover:border-stone-500")}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-2">{tProfile('packWeight')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'minimalist' as const, label: `🎒 ${tProfile('minimalist')}` },
                        { value: 'moderate' as const, label: `🧳 ${tProfile('moderatePack')}` },
                        { value: 'maximalist' as const, label: `💼 ${tProfile('maximalist')}` },
                      ]).map(opt => (
                        <button key={opt.value} type="button" onClick={() => setPackWeight(opt.value)}
                          className={clsx("px-2 py-2 rounded-lg text-xs font-medium transition-colors border text-center",
                            packWeight === opt.value ? "bg-orange-600 border-orange-500 text-white" : "bg-stone-700 border-stone-600 hover:border-stone-500")}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-2">{tProfile('electronicsNeeds')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'low' as const, label: `📵 ${tProfile('minimal')}` },
                        { value: 'medium' as const, label: `📱 ${tProfile('phoneLaptop')}` },
                        { value: 'high' as const, label: `🎬 ${tProfile('creatorKit')}` },
                      ]).map(opt => (
                        <button key={opt.value} type="button" onClick={() => setElectronicsTolerance(opt.value)}
                          className={clsx("px-2 py-2 rounded-lg text-xs font-medium transition-colors border text-center",
                            electronicsTolerance === opt.value ? "bg-orange-600 border-orange-500 text-white" : "bg-stone-700 border-stone-600 hover:border-stone-500")}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-2">{tProfile('budgetStyle')}</label>
                    <div className="space-y-2">
                      {([
                        { value: 'broke-backpacker' as const, label: tProfile('brokeBackpacker'), emoji: '💸', tooltip: t('brokeBackpackerTooltip') },
                        { value: 'flashpacker' as const, label: tProfile('flashpacker'), emoji: '💳', tooltip: t('flashpackerTooltip') },
                        { value: 'digital-nomad' as const, label: tProfile('digitalNomad'), emoji: '💻', tooltip: t('digitalNomadTooltip') },
                      ]).map(opt => (
                        <button key={opt.value} type="button" onClick={() => setBudgetPreference(opt.value)}
                          className={clsx("w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors border text-left flex items-center gap-2",
                            budgetPreference === opt.value ? "bg-orange-600 border-orange-500 text-white" : "bg-stone-700 border-stone-600 hover:border-stone-500")}>
                          <span>{opt.emoji}</span>
                          <span className="flex-1">{opt.label}</span>
                          <Tooltip content={opt.tooltip}>
                            <Info size={14} className={clsx("cursor-help", budgetPreference === opt.value ? "text-white/70" : "text-stone-400")} />
                          </Tooltip>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* STEP 7: Safety & Content Creation */}
            {step === 7 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button type="button" onClick={handlePrevStep} className="text-stone-400 hover:text-white transition-colors flex items-center gap-1">
                    <ChevronLeft size={18} /> Back
                  </button>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Shield size={20} className="text-orange-500" />
                    Safety & Content
                  </h2>
                  <div className="w-16" />
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-2">{tProfile('safetyPreferences')}</label>
                    <div className="space-y-2">
                      <ToggleButton value={walkAtNight} onChange={setWalkAtNight} label={tProfile('comfortableNightWalking')} />
                      <ToggleButton value={experiencedMotos} onChange={setExperiencedMotos} label={tProfile('experiencedMotorbikes')} />
                      <ToggleButton value={openToCouchsurfing} onChange={setOpenToCouchsurfing} label={tProfile('openToCouchsurfing')} />
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <ToggleButton value={femaleTravelerConcerns} onChange={setFemaleTravelerConcerns} label={tProfile('femaleTravelerConcerns')} />
                        </div>
                        <Tooltip content={tProfile('femaleTravelerTooltip')}>
                          <Info size={16} className="text-stone-400 cursor-help" />
                        </Tooltip>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-2 flex items-center gap-2">
                      <Camera size={14} />
                      {tProfile('contentCreation')}
                    </label>
                    <div className="space-y-2">
                      <ToggleButton value={instagramFriendly} onChange={setInstagramFriendly} label={tProfile('prioritizeInstagram')} />
                      <ToggleButton value={hiddenSpots} onChange={setHiddenSpots} label={tProfile('showHiddenGems')} />
                      <ToggleButton value={videoFocus} onChange={setVideoFocus} label={tProfile('focusVideo')} />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Navigation Buttons */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-600 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating Account...
                </>
              ) : step === totalSteps ? (
                t('createAccount')
              ) : (
                <>Next <ChevronRight size={18} /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-stone-400 mt-4">
            {t('alreadyHaveAccount')}{' '}
            <Link href="/auth/login" className="text-orange-400 hover:text-orange-300">
              {t('signIn')}
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-stone-500 mt-6">
          Powered by{' '}
          <a href="https://www.thebrokebackpacker.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300">
            The Broke Backpacker
          </a>
        </p>
      </div>
    </div>
  );
}
