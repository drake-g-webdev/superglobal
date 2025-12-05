"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

const STORAGE_KEY = 'tbp-user-profile';

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
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
      } catch (e) {
        console.error('Failed to parse stored profile:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    }
  }, [profile, isLoaded]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const clearProfile = () => {
    setProfile(defaultProfile);
    localStorage.removeItem(STORAGE_KEY);
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
