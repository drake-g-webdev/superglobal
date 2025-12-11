"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, User, MapPin, Loader2, AlertCircle, ChevronRight, ChevronLeft, Key, Globe, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SpinningGlobe from '../../components/SpinningGlobe';
import { useProfile, UserProfile } from '../../context/ProfileContext';
import { useTranslations, useLocale } from '../../context/LocaleContext';
import clsx from 'clsx';

// Tooltip component
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
        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-stone-900 border border-stone-600 rounded-lg text-xs text-stone-300 w-64 shadow-lg">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-600" />
        </div>
      )}
    </div>
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

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Account details
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [masterPassword, setMasterPassword] = useState('');

  // Step 2: Language selection (handled by locale context)

  // Step 3: Required profile fields
  const [name, setName] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [passportCountry, setPassportCountry] = useState('');
  const [budgetPreference, setBudgetPreference] = useState<UserProfile['budgetPreference']>('broke-backpacker');

  // Step 4: Additional profile fields (travel preferences)
  const [riskTolerance, setRiskTolerance] = useState<'low' | 'medium' | 'high'>('medium');
  const [comfortThreshold, setComfortThreshold] = useState<'hotels' | 'hostels' | 'tents' | 'van' | 'couchsurfing'>('hostels');
  const [travelPace, setTravelPace] = useState<'slow' | 'moderate' | 'fast'>('moderate');
  const [foodPreference, setFoodPreference] = useState<'street_food' | 'restaurants' | 'cooking' | 'mixed'>('street_food');

  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showPassportSuggestions, setShowPassportSuggestions] = useState(false);

  const filteredOriginSuggestions = countryOfOrigin
    ? COUNTRIES.filter(c => c.toLowerCase().includes(countryOfOrigin.toLowerCase())).slice(0, 5)
    : [];

  const filteredPassportSuggestions = passportCountry
    ? COUNTRIES.filter(c => c.toLowerCase().includes(passportCountry.toLowerCase())).slice(0, 5)
    : [];

  const validateStep1 = () => {
    if (!email || !password || !confirmPassword || !masterPassword) {
      setError('All fields are required');
      return false;
    }
    // Validate master password
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
    if (!passportCountry.trim()) {
      setError('Passport country is required');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    setError('');
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2) {
      // Language selection - just move to next step
      setStep(3);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === 3) {
      if (!validateStep3()) return;
      setStep(4); // Move to step 4 for travel preferences
      return;
    }

    // Step 4 - final submission
    setIsLoading(true);

    try {
      const result = await signup(email, password, name);

      if (!result.ok) {
        setError(result.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      // Build full profile data for both local and database
      const fullProfileData = {
        name,
        countryOfOrigin,
        passportCountry,
        budgetPreference,
        riskTolerance,
        comfortThreshold,
        travelPace,
        foodPreference,
      };

      // Save profile data to local state
      updateProfile(fullProfileData);

      // Sync profile to database immediately (don't wait for debounce)
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          countryOfOrigin,
          passportCountry,
          budgetStyle: budgetPreference,
          riskTolerance,
          comfortThreshold: [comfortThreshold],
          travelPace,
          foodPreference,
        }),
      });

      // Mark profile as complete
      await markProfileComplete();

      // Redirect to main app
      router.push('/app');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
            <SpinningGlobe size={80} />
          </div>
          <h1 className="text-2xl font-bold text-white font-mono">superglobal.travel</h1>
          <p className="text-stone-400 mt-2">Create your account</p>
        </div>

        {/* Progress indicator - 4 steps */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={clsx(
            "w-3 h-3 rounded-full transition-colors",
            step >= 1 ? "bg-orange-500" : "bg-stone-700"
          )} />
          <div className="w-6 h-0.5 bg-stone-700" />
          <div className={clsx(
            "w-3 h-3 rounded-full transition-colors",
            step >= 2 ? "bg-orange-500" : "bg-stone-700"
          )} />
          <div className="w-6 h-0.5 bg-stone-700" />
          <div className={clsx(
            "w-3 h-3 rounded-full transition-colors",
            step >= 3 ? "bg-orange-500" : "bg-stone-700"
          )} />
          <div className="w-6 h-0.5 bg-stone-700" />
          <div className={clsx(
            "w-3 h-3 rounded-full transition-colors",
            step >= 4 ? "bg-orange-500" : "bg-stone-700"
          )} />
        </div>

        {/* Form */}
        <div className="bg-stone-800 rounded-2xl p-6 border border-stone-700">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={(step === 3 || step === 4) ? handleSubmit : (e) => { e.preventDefault(); handleNextStep(); }}>
            {step === 1 ? (
              <>
                <h2 className="text-lg font-semibold mb-4">Account Details</h2>
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
                    <p className="text-xs text-stone-500 mt-1">Required to access the app</p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-6 bg-orange-600 hover:bg-orange-500 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Next <ChevronRight size={18} />
                </button>
              </>
            ) : step === 2 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-stone-400 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft size={18} /> Back
                  </button>
                  <h2 className="text-lg font-semibold">{t('selectLanguage')}</h2>
                  <div className="w-16" />
                </div>

                <p className="text-sm text-stone-400 mb-6 text-center">
                  {t('languageDescription')}
                </p>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setLocale('en')}
                    className={clsx(
                      "w-full px-4 py-4 rounded-lg text-left flex items-center gap-4 border transition-colors",
                      locale === 'en'
                        ? "bg-orange-600 border-orange-500 text-white"
                        : "bg-stone-700 border-stone-600 hover:border-stone-500"
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
                      locale === 'es'
                        ? "bg-orange-600 border-orange-500 text-white"
                        : "bg-stone-700 border-stone-600 hover:border-stone-500"
                    )}
                  >
                    <Globe size={24} />
                    <div>
                      <div className="font-semibold">{tLanguage('spanish')}</div>
                      <div className="text-sm opacity-75">Spanish</div>
                    </div>
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full mt-6 bg-orange-600 hover:bg-orange-500 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Next <ChevronRight size={18} />
                </button>
              </>
            ) : step === 3 ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="text-stone-400 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft size={18} /> Back
                  </button>
                  <h2 className="text-lg font-semibold">{t('yourProfile')}</h2>
                  <div className="w-16" />
                </div>

                <p className="text-sm text-stone-400 mb-4">
                  {t('profileRequired')}
                </p>

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
                          <button
                            key={country}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setCountryOfOrigin(country); setShowOriginSuggestions(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-stone-600"
                          >
                            {country}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-1">{tProfile('passportCountry')} *</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                      <input
                        type="text"
                        value={passportCountry}
                        onChange={(e) => { setPassportCountry(e.target.value); setShowPassportSuggestions(true); }}
                        onFocus={() => setShowPassportSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowPassportSuggestions(false), 200)}
                        placeholder={tProfile('passportPlaceholder')}
                        className="w-full bg-stone-700 border border-stone-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-orange-500"
                        required
                      />
                    </div>
                    {showPassportSuggestions && filteredPassportSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-stone-700 border border-stone-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {filteredPassportSuggestions.map(country => (
                          <button
                            key={country}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setPassportCountry(country); setShowPassportSuggestions(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-stone-600"
                          >
                            {country}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-2">{tProfile('budgetStyle')} *</label>
                    <div className="grid grid-cols-1 gap-2">
                      {([
                        { value: 'broke-backpacker' as const, label: tProfile('brokeBackpacker'), emoji: '💸', tooltip: t('brokeBackpackerTooltip') },
                        { value: 'flashpacker' as const, label: tProfile('flashpacker'), emoji: '💳', tooltip: t('flashpackerTooltip') },
                        { value: 'digital-nomad' as const, label: tProfile('digitalNomad'), emoji: '💻', tooltip: t('digitalNomadTooltip') },
                      ]).map(opt => (
                        <div key={opt.value} className="relative">
                          <button
                            type="button"
                            onClick={() => setBudgetPreference(opt.value)}
                            className={clsx(
                              "w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors border text-left flex items-center gap-2",
                              budgetPreference === opt.value
                                ? "bg-orange-600 border-orange-500 text-white"
                                : "bg-stone-700 border-stone-600 hover:border-stone-500"
                            )}
                          >
                            <span>{opt.emoji}</span>
                            <span className="flex-1">{opt.label}</span>
                            <Tooltip content={opt.tooltip}>
                              <Info size={16} className={clsx(
                                "cursor-help",
                                budgetPreference === opt.value ? "text-white/70" : "text-stone-400"
                              )} />
                            </Tooltip>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-6 bg-orange-600 hover:bg-orange-500 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
                >
                  Next <ChevronRight size={18} />
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="text-stone-400 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft size={18} /> Back
                  </button>
                  <h2 className="text-lg font-semibold">{tProfile('travelPreferences')}</h2>
                  <div className="w-16" />
                </div>

                <p className="text-sm text-stone-400 mb-4">
                  Tell us how you like to travel so we can personalize your experience.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-2">{tProfile('riskTolerance')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'low' as const, label: '🛡️ Safe', desc: 'Tourist areas' },
                        { value: 'medium' as const, label: '⚖️ Balanced', desc: 'Some adventure' },
                        { value: 'high' as const, label: '🔥 Send it', desc: 'Off the grid' },
                      ]).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRiskTolerance(opt.value)}
                          className={clsx(
                            "px-3 py-2 rounded-lg text-xs font-medium transition-colors border text-center",
                            riskTolerance === opt.value
                              ? "bg-orange-600 border-orange-500 text-white"
                              : "bg-stone-700 border-stone-600 hover:border-stone-500"
                          )}
                        >
                          <div>{opt.label}</div>
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
                        { value: 'couchsurfing' as const, label: '🛋️ Couchsurf' },
                      ]).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setComfortThreshold(opt.value)}
                          className={clsx(
                            "px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
                            comfortThreshold === opt.value
                              ? "bg-orange-600 border-orange-500 text-white"
                              : "bg-stone-700 border-stone-600 hover:border-stone-500"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-2">{tProfile('travelPace')}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'slow' as const, label: '🐢 Slow', desc: '5+ days/place' },
                        { value: 'moderate' as const, label: '🚶 Moderate', desc: '2-4 days/place' },
                        { value: 'fast' as const, label: '🏃 Fast', desc: '1-2 days/place' },
                      ]).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTravelPace(opt.value)}
                          className={clsx(
                            "px-3 py-2 rounded-lg text-xs font-medium transition-colors border text-center",
                            travelPace === opt.value
                              ? "bg-orange-600 border-orange-500 text-white"
                              : "bg-stone-700 border-stone-600 hover:border-stone-500"
                          )}
                        >
                          <div>{opt.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-400 uppercase font-bold mb-2">{tProfile('foodPreference')}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: 'street_food' as const, label: '🍜 Street Food' },
                        { value: 'restaurants' as const, label: '🍽️ Restaurants' },
                        { value: 'cooking' as const, label: '🍳 Self Cook' },
                        { value: 'mixed' as const, label: '🔀 Mixed' },
                      ]).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFoodPreference(opt.value)}
                          className={clsx(
                            "px-3 py-2 rounded-lg text-sm font-medium transition-colors border",
                            foodPreference === opt.value
                              ? "bg-orange-600 border-orange-500 text-white"
                              : "bg-stone-700 border-stone-600 hover:border-stone-500"
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

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
                  ) : (
                    t('createAccount')
                  )}
                </button>
              </>
            )}
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
          <a
            href="https://www.thebrokebackpacker.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300"
          >
            The Broke Backpacker
          </a>
        </p>
      </div>
    </div>
  );
}
