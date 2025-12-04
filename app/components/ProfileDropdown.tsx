"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslations } from '../context/LocaleContext';
import clsx from 'clsx';

interface ProfileDropdownProps {
  onOpenProfile: () => void;
}

export default function ProfileDropdown({ onOpenProfile }: ProfileDropdownProps) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { profile } = useProfile();
  const t = useTranslations('profile');
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

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push('/auth/login')}
          className="text-sm text-stone-400 hover:text-white transition-colors px-3 py-1.5"
        >
          Sign In
        </button>
        <button
          onClick={() => router.push('/auth/signup')}
          className="text-sm bg-orange-600 hover:bg-orange-500 text-white rounded-lg px-4 py-1.5 transition-colors"
        >
          Sign Up
        </button>
      </div>
    );
  }

  const displayName = profile.name || user?.name || user?.email?.split('@')[0] || 'Traveler';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors",
          isOpen ? "bg-stone-700" : "hover:bg-stone-800"
        )}
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-orange-600 flex items-center justify-center text-white text-sm font-medium">
          {initials}
        </div>
        <span className="text-sm font-medium hidden sm:block max-w-[100px] truncate">
          {displayName}
        </span>
        <ChevronDown size={14} className={clsx(
          "text-stone-400 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-stone-800 border border-stone-700 rounded-xl shadow-xl overflow-hidden z-50">
          {/* User info header */}
          <div className="px-4 py-3 border-b border-stone-700 bg-stone-800/50">
            <p className="text-sm font-medium text-white truncate">{displayName}</p>
            <p className="text-xs text-stone-400 truncate">{user?.email}</p>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenProfile();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-white transition-colors"
            >
              <Settings size={16} className="text-stone-400" />
              {t('title')}
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-stone-700 hover:text-red-300 transition-colors"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
