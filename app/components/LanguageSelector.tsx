"use client";

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useLocale, Locale } from '../context/LocaleContext';
import clsx from 'clsx';

const LANGUAGES: { code: Locale; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'toggle';
  className?: string;
}

export default function LanguageSelector({ variant = 'dropdown', className }: LanguageSelectorProps) {
  const { locale, setLocale, t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLanguage = LANGUAGES.find(l => l.code === locale) || LANGUAGES[0];

  if (variant === 'toggle') {
    return (
      <div className={clsx("flex items-center gap-1 bg-stone-800 rounded-lg p-1", className)}>
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => setLocale(lang.code)}
            className={clsx(
              "px-3 py-1.5 rounded text-sm font-medium transition-colors",
              locale === lang.code
                ? "bg-orange-600 text-white"
                : "text-stone-400 hover:text-white hover:bg-stone-700"
            )}
          >
            {lang.flag} {lang.code.toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={clsx("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 rounded-lg transition-colors"
      >
        <span className="text-sm">{currentLanguage.flag} {currentLanguage.name}</span>
        <ChevronDown
          size={14}
          className={clsx(
            "text-stone-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-stone-800 border border-stone-700 rounded-lg shadow-lg z-50 overflow-hidden">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                setLocale(lang.code);
                setIsOpen(false);
              }}
              className={clsx(
                "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-stone-700 transition-colors",
                locale === lang.code && "bg-stone-700/50"
              )}
            >
              <span>{lang.flag} {lang.name}</span>
              {locale === lang.code && <Check size={14} className="text-orange-500" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
