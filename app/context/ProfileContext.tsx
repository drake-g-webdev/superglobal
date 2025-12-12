"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// ============================================
// FEATURE SET A: Enhanced Traveler Profile
// ============================================

export type RiskTolerance = 'low' | 'medium' | 'high';
export type ComfortThreshold = 'hotels' | 'hostels' | 'tents' | 'van' | 'couchsurfing';
export type FoodPreference = 'street_food' | 'restaurants' | 'cooking' | 'mixed';
export type TravelPace = 'slow' | 'moderate' | 'fast';
// Pack weight descriptions in LBS for US audience
export type PackWeight = 'minimalist' | 'moderate' | 'maximalist'; // <20lbs, 20-35lbs, 35+lbs
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

  // Travel style and budget
  travelStyle: 'solo' | 'couple' | 'group' | 'family';
  budgetPreference: 'broke-backpacker' | 'flashpacker' | 'digital-nomad';

  // Travel History & Dreams (user can fill out later)
  countriesVisited: string[];
  bucketList: string[];
  interests: string[];
  restrictions: string[];

  // Travel Style Indicators
  riskTolerance: RiskTolerance;
  comfortThreshold: ComfortThreshold;
  activityWeighting: ActivityWeighting;
  foodPreference: FoodPreference;
  travelPace: TravelPace;
  electronicsTolerance: ElectronicsTolerance;

  // Backpack Weight Preferences (in LBS: minimalist <20, moderate 20-35, maximalist 35+)
  packWeight: PackWeight;

  // Safety Profile
  walkAtNight: boolean;
  experiencedMotos: boolean;
  openToCouchsurfing: boolean;
  femaleTravelerConcerns: boolean;

  // Content Creation Goals
  instagramFriendly: boolean;
  hiddenSpots: boolean;
  videoFocus: boolean;
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

  // Travel style and budget
  travelStyle: 'solo',
  budgetPreference: 'broke-backpacker',

  // Travel History & Dreams (empty by default, user fills later)
  countriesVisited: [],
  bucketList: [],
  interests: [],
  restrictions: [],

  // Travel Style Indicators
  riskTolerance: 'medium',
  comfortThreshold: 'hostels',
  activityWeighting: defaultActivityWeighting,
  foodPreference: 'street_food',
  travelPace: 'moderate',
  electronicsTolerance: 'medium',

  // Backpack Weight (LBS)
  packWeight: 'moderate',

  // Safety Profile - all false by default (no auto-selection)
  walkAtNight: false,
  experiencedMotos: false,
  openToCouchsurfing: false,
  femaleTravelerConcerns: false,

  // Content Creation - all false by default (no auto-selection)
  instagramFriendly: false,
  hiddenSpots: false,
  videoFocus: false,
};

interface ProfileContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  clearProfile: () => void;
  isProfileSet: boolean;
  isSyncing: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'tbp-user-profile';

// Get user-specific storage key
function getStorageKey(userId: string | null | undefined): string {
  if (!userId) return STORAGE_KEY_PREFIX; // Fallback for unauthenticated state
  return `${STORAGE_KEY_PREFIX}-${userId}`;
}

// Convert database profile to local profile format
function dbToLocalProfile(dbProfile: Record<string, unknown>): Partial<UserProfile> {
  return {
    // Name is included from User model in the API response
    name: (dbProfile.name as string) || '',
    countryOfOrigin: (dbProfile.countryOfOrigin as string) || '',
    travelStyle: (dbProfile.travelStyle as UserProfile['travelStyle']) || 'solo',
    budgetPreference: (dbProfile.budgetStyle as UserProfile['budgetPreference']) || 'broke-backpacker',
    riskTolerance: (dbProfile.riskTolerance as RiskTolerance) || 'medium',
    comfortThreshold: ((dbProfile.comfortThreshold as string[])?.[0] as ComfortThreshold) || 'hostels',
    travelPace: (dbProfile.travelPace as TravelPace) || 'moderate',
    activityWeighting: {
      party: (dbProfile.partyWeight as number) ?? 20,
      nature: (dbProfile.natureWeight as number) ?? 30,
      culture: (dbProfile.cultureWeight as number) ?? 25,
      adventure: (dbProfile.adventureWeight as number) ?? 15,
      relaxation: (dbProfile.relaxationWeight as number) ?? 10,
    },
    foodPreference: (dbProfile.foodPreference as FoodPreference) || 'street_food',
    packWeight: (dbProfile.packWeight as PackWeight) || 'moderate',
    electronicsTolerance: (dbProfile.electronicsTolerance as ElectronicsTolerance) || 'medium',
    // Safety Profile - default to false (no auto-selection)
    walkAtNight: (dbProfile.nightWalking as boolean) ?? false,
    experiencedMotos: (dbProfile.motorbikeOk as boolean) ?? false,
    openToCouchsurfing: (dbProfile.couchsurfingOk as boolean) ?? false,
    femaleTravelerConcerns: (dbProfile.femaleSafety as boolean) ?? false,
    // Content Creation - default to false (no auto-selection)
    instagramFriendly: (dbProfile.instagramSpots as boolean) ?? false,
    hiddenSpots: (dbProfile.hiddenGems as boolean) ?? false,
    videoFocus: (dbProfile.videoLocations as boolean) ?? false,
    // Travel History & Dreams
    countriesVisited: (dbProfile.countriesVisited as string[]) || [],
    bucketList: (dbProfile.bucketList as string[]) || [],
    interests: (dbProfile.interests as string[]) || [],
    restrictions: (dbProfile.restrictions as string[]) || [],
  };
}

// Convert local profile to database format
function localToDbProfile(profile: UserProfile): Record<string, unknown> {
  return {
    countryOfOrigin: profile.countryOfOrigin || null,
    travelStyle: profile.travelStyle || null,
    budgetStyle: profile.budgetPreference || null,
    riskTolerance: profile.riskTolerance || null,
    comfortThreshold: profile.comfortThreshold ? [profile.comfortThreshold] : [],
    travelPace: profile.travelPace || null,
    partyWeight: profile.activityWeighting?.party ?? 50,
    natureWeight: profile.activityWeighting?.nature ?? 50,
    cultureWeight: profile.activityWeighting?.culture ?? 50,
    adventureWeight: profile.activityWeighting?.adventure ?? 50,
    relaxationWeight: profile.activityWeighting?.relaxation ?? 50,
    foodPreference: profile.foodPreference || null,
    packWeight: profile.packWeight || null,
    electronicsTolerance: profile.electronicsTolerance || null,
    nightWalking: profile.walkAtNight ?? false,
    motorbikeOk: profile.experiencedMotos ?? false,
    couchsurfingOk: profile.openToCouchsurfing ?? false,
    femaleSafety: profile.femaleTravelerConcerns ?? false,
    instagramSpots: profile.instagramFriendly ?? false,
    hiddenGems: profile.hiddenSpots ?? false,
    videoLocations: profile.videoFocus ?? false,
    countriesVisited: profile.countriesVisited || [],
    bucketList: profile.bucketList || [],
    interests: profile.interests || [],
    restrictions: profile.restrictions || [],
  };
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const prevUserIdRef = useRef<string | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync profile to database (debounced)
  const syncToDatabase = useCallback(async (profileData: UserProfile) => {
    if (!userId) return;

    try {
      setIsSyncing(true);
      const dbData = localToDbProfile(profileData);
      console.log('[ProfileContext] Syncing to database:', {
        countryOfOrigin: dbData.countryOfOrigin,
        riskTolerance: dbData.riskTolerance,
        travelPace: dbData.travelPace,
      });
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbData),
      });
      console.log('[ProfileContext] Sync response:', response.status, response.ok);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[ProfileContext] Sync failed:', errorData);
      }
    } catch (error) {
      console.error('Failed to sync profile to database:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [userId]);

  // Load profile from database
  const loadFromDatabase = useCallback(async (): Promise<Partial<UserProfile> | null> => {
    if (!userId) return null;

    try {
      console.log('[ProfileContext] Loading profile from database for user:', userId);
      const response = await fetch('/api/profile');
      console.log('[ProfileContext] API response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[ProfileContext] Raw API data:', data);
        console.log('[ProfileContext] API data keys:', Object.keys(data));
        if (data && Object.keys(data).length > 0 && !data.error) {
          const converted = dbToLocalProfile(data);
          console.log('[ProfileContext] Converted profile:', converted);
          return converted;
        }
      }
    } catch (error) {
      console.error('Failed to load profile from database:', error);
    }
    return null;
  }, [userId]);

  // Load profile from localStorage for the current user
  const loadProfileForUser = useCallback(async (uid: string | null | undefined) => {
    const storageKey = getStorageKey(uid);
    const stored = localStorage.getItem(storageKey);
    let localProfile: UserProfile | null = null;

    console.log('[ProfileContext] loadProfileForUser called for uid:', uid);
    console.log('[ProfileContext] Storage key:', storageKey);
    console.log('[ProfileContext] Raw localStorage data exists:', !!stored);

    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log('[ProfileContext] Parsed localStorage:', {
          name: parsed.name,
          countryOfOrigin: parsed.countryOfOrigin,
          travelStyle: parsed.travelStyle,
          riskTolerance: parsed.riskTolerance
        });
        localProfile = {
          ...defaultProfile,
          ...parsed,
          activityWeighting: { ...defaultActivityWeighting, ...(parsed.activityWeighting || {}) }
        };
      } catch (e) {
        console.error('Failed to parse stored profile:', e);
      }
    }

    // If user is authenticated, try to load from database
    if (uid) {
      const dbProfile = await loadFromDatabase();
      console.log('[ProfileContext] DB profile result:', dbProfile ? 'found' : 'not found');
      if (dbProfile) {
        console.log('[ProfileContext] DB profile fields:', {
          countryOfOrigin: dbProfile.countryOfOrigin,
          travelStyle: dbProfile.travelStyle,
          riskTolerance: dbProfile.riskTolerance,
        });
      }
      // Check if DB profile has meaningful data (not just defaults)
      const dbHasMeaningfulData = dbProfile && (
        dbProfile.countryOfOrigin ||
        dbProfile.passportCountry ||
        dbProfile.riskTolerance !== 'medium' ||
        dbProfile.travelPace !== 'moderate'
      );

      console.log('[ProfileContext] DB has meaningful data:', dbHasMeaningfulData);

      if (dbHasMeaningfulData) {
        // Database profile exists with real data - use it as source of truth
        const mergedProfile = {
          ...defaultProfile,
          ...dbProfile,
        } as UserProfile;
        console.log('[ProfileContext] Using DB profile, merged result:', {
          name: mergedProfile.name,
          countryOfOrigin: mergedProfile.countryOfOrigin,
          travelStyle: mergedProfile.travelStyle,
          riskTolerance: mergedProfile.riskTolerance,
        });
        setProfile(mergedProfile);
        // Also update localStorage
        localStorage.setItem(storageKey, JSON.stringify(mergedProfile));
        return;
      } else if (localProfile && localProfile.name) {
        // DB profile is empty/default but local profile exists - use local and sync to DB
        console.log('[ProfileContext] DB profile empty, using local profile and syncing');
        await syncToDatabase(localProfile);
        setProfile(localProfile);
        return;
      } else if (dbProfile && Object.keys(dbProfile).length > 0) {
        // DB has a profile record (even if defaults) - still use it
        const mergedProfile = {
          ...defaultProfile,
          ...dbProfile,
        } as UserProfile;
        console.log('[ProfileContext] Using DB profile (defaults):', mergedProfile.countryOfOrigin);
        setProfile(mergedProfile);
        localStorage.setItem(storageKey, JSON.stringify(mergedProfile));
        return;
      }
    }

    // Use local profile or defaults
    console.log('[ProfileContext] Using local profile or defaults');
    setProfile(localProfile || defaultProfile);
  }, [loadFromDatabase, syncToDatabase]);

  // Load from localStorage on mount and when user changes
  useEffect(() => {
    // Wait for session to be determined (not loading)
    if (status === 'loading') return;

    // Check if user changed
    const userChanged = prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId;
    prevUserIdRef.current = userId;

    if (userChanged || !isLoaded) {
      loadProfileForUser(userId).then(() => setIsLoaded(true));
    }
  }, [userId, status, isLoaded, loadProfileForUser]);

  // Save to localStorage on change and debounced sync to database
  useEffect(() => {
    if (isLoaded && status !== 'loading') {
      const storageKey = getStorageKey(userId);
      localStorage.setItem(storageKey, JSON.stringify(profile));

      // Debounced sync to database
      if (userId) {
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        syncTimeoutRef.current = setTimeout(() => {
          syncToDatabase(profile);
        }, 1000); // 1 second debounce
      }
    }

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [profile, isLoaded, userId, status, syncToDatabase]);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const clearProfile = () => {
    setProfile(defaultProfile);
    const storageKey = getStorageKey(userId);
    localStorage.removeItem(storageKey);
    // Also clear from database
    if (userId) {
      fetch('/api/profile', {
        method: 'DELETE',
      }).catch(err => console.error('Failed to delete profile from database:', err));
    }
  };

  const isProfileSet = profile.name.trim().length > 0;

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, clearProfile, isProfileSet, isSyncing }}>
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
