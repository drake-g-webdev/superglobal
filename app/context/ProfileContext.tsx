"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useSession } from 'next-auth/react';

// ============================================
// FEATURE SET A: Enhanced Traveler Profile
// ============================================

export type RiskTolerance = 'low' | 'medium' | 'high';
export type ComfortThreshold = 'hotels' | 'hostels' | 'tents' | 'van' | 'couchsurfing';
export type HygieneThreshold = 'daily' | 'every_3_days' | 'broke_backpacker_mode';
export type FoodPreference = 'street_food' | 'restaurants' | 'cooking' | 'mixed';
export type TravelPace = 'slow' | 'moderate' | 'fast';
export type PackWeight = 'minimalist' | 'moderate' | 'maximalist';
export type IncomeType = 'remote_worker' | 'seasonal_worker' | 'savings_only' | 'passive_income';
export type ElectronicsTolerance = 'low' | 'medium' | 'high';

export interface ActivityWeighting {
  party: number;      // 0-100
  nature: number;     // 0-100
  culture: number;    // 0-100
  adventure: number;  // 0-100
  relaxation: number; // 0-100
}

export interface UserProfile {
  // Basic Info
  name: string;
  countryOfOrigin: string;
  passportCountry: string;

  // Original fields
  travelStyle: 'solo' | 'couple' | 'group' | 'family';
  budgetPreference: 'broke-backpacker' | 'flashpacker' | 'digital-nomad';
  countriesVisited: string[];
  bucketList: string[];
  interests: string[];
  restrictions: string[];

  // NEW: Travel Style Indicators (Broke Backpacker-Specific)
  riskTolerance: RiskTolerance;
  comfortThreshold: ComfortThreshold;
  hygieneThreshold: HygieneThreshold;
  activityWeighting: ActivityWeighting;
  foodPreference: FoodPreference;
  travelPace: TravelPace;
  electronicsTolerance: ElectronicsTolerance;

  // NEW: Backpack Weight Preferences
  packWeight: PackWeight;

  // NEW: Income Type (For Budget Modeling)
  incomeType: IncomeType;
  monthlyBudget: number; // USD

  // NEW: Safety Profile (Long-term preferences)
  walkAtNight: boolean;
  experiencedMotos: boolean;
  openToCouchsurfing: boolean;
  femaleTravelerConcerns: boolean;

  // NEW: Content Creation Goals
  instagramFriendly: boolean;
  hiddenSpots: boolean;
  videoFocus: boolean;
  sunriseSunsetOptimization: boolean;
}

export const defaultActivityWeighting: ActivityWeighting = {
  party: 20,
  nature: 30,
  culture: 25,
  adventure: 15,
  relaxation: 10,
};

export const defaultProfile: UserProfile = {
  // Basic Info
  name: '',
  countryOfOrigin: '',
  passportCountry: '',

  // Original fields
  travelStyle: 'solo',
  budgetPreference: 'broke-backpacker',
  countriesVisited: [],
  bucketList: [],
  interests: [],
  restrictions: [],

  // Travel Style Indicators
  riskTolerance: 'medium',
  comfortThreshold: 'hostels',
  hygieneThreshold: 'every_3_days',
  activityWeighting: defaultActivityWeighting,
  foodPreference: 'street_food',
  travelPace: 'moderate',
  electronicsTolerance: 'medium',

  // Backpack Weight
  packWeight: 'moderate',

  // Income Type
  incomeType: 'savings_only',
  monthlyBudget: 1500,

  // Safety Profile
  walkAtNight: true,
  experiencedMotos: false,
  openToCouchsurfing: false,
  femaleTravelerConcerns: false,

  // Content Creation
  instagramFriendly: false,
  hiddenSpots: true,
  videoFocus: false,
  sunriseSunsetOptimization: false,
};

interface ProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;
  isProfileSet: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'tbp-user-profile';

// Get user-specific storage key
function getStorageKey(userId: string | null | undefined): string {
  if (!userId) return STORAGE_KEY_PREFIX; // Fallback for unauthenticated state
  return `${STORAGE_KEY_PREFIX}-${userId}`;
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load profile from localStorage for the current user
  const loadProfileForUser = (uid: string | null | undefined) => {
    const storageKey = getStorageKey(uid);
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new fields added to profile
        setProfile({
          ...defaultProfile,
          ...parsed,
          // Ensure nested objects are properly merged
          activityWeighting: { ...defaultActivityWeighting, ...(parsed.activityWeighting || {}) }
        });
        return;
      } catch (e) {
        console.error('Failed to parse stored profile:', e);
      }
    }
    // No stored profile or parse error - use defaults
    setProfile(defaultProfile);
  };

  // Load from localStorage on mount and when user changes
  useEffect(() => {
    // Wait for session to be determined (not loading)
    if (status === 'loading') return;

    // Check if user changed
    const userChanged = prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId;
    prevUserIdRef.current = userId;

    if (userChanged || !isLoaded) {
      loadProfileForUser(userId);
      setIsLoaded(true);
    }
  }, [userId, status]);

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded && status !== 'loading') {
      const storageKey = getStorageKey(userId);
      localStorage.setItem(storageKey, JSON.stringify(profile));
    }
  }, [profile, isLoaded, userId, status]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const clearProfile = () => {
    setProfile(defaultProfile);
    const storageKey = getStorageKey(userId);
    localStorage.removeItem(storageKey);
  };

  const isProfileSet = profile.name.trim().length > 0;

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, clearProfile, isProfileSet }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
