"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Locale = 'en' | 'es';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  messages: Record<string, unknown>;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// Import messages statically
import enMessages from '../../messages/en.json';
import esMessages from '../../messages/es.json';

const messages: Record<Locale, Record<string, unknown>> = {
  en: enMessages,
  es: esMessages,
};

// Helper to get nested value from object using dot notation
function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // Return the key if path not found
    }
  }

  return typeof current === 'string' ? current : path;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [isHydrated, setIsHydrated] = useState(false);

  // Load locale from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('locale');
    if (stored === 'en' || stored === 'es') {
      setLocaleState(stored);
    }
    setIsHydrated(true);
  }, []);

  // Save locale to localStorage when it changes
  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  // Translation function
  const t = (key: string): string => {
    return getNestedValue(messages[locale] as Record<string, unknown>, key);
  };

  // Prevent hydration mismatch by not rendering until we've loaded the locale
  if (!isHydrated) {
    return null;
  }

  return (
    <LocaleContext.Provider value={{
      locale,
      setLocale,
      t,
      messages: messages[locale] as Record<string, unknown>
    }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

// Hook that returns just the translation function for convenience
export function useTranslations(namespace?: string) {
  const { t, locale } = useLocale();

  if (namespace) {
    return (key: string) => t(`${namespace}.${key}`);
  }

  return t;
}
