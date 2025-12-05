"use client";

import { useState } from 'react';
import {
  Backpack, Plus, Trash2, Check, X, Sparkles, RefreshCw,
  Shirt, Smartphone, Droplets, FileText, Compass, HeartPulse, Package,
  ChevronDown, ChevronUp, Loader2
} from 'lucide-react';
import clsx from 'clsx';
import { useChats, PackingItem } from '../context/ChatsContext';
import { useProfile } from '../context/ProfileContext';
import { useTranslations } from '../context/LocaleContext';

type PackingCategory = PackingItem['category'];

const CATEGORY_CONFIG: Record<PackingCategory, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  clothing: { label: 'Clothing', icon: Shirt, color: '#3b82f6' },
  electronics: { label: 'Electronics', icon: Smartphone, color: '#8b5cf6' },
  toiletries: { label: 'Toiletries', icon: Droplets, color: '#06b6d4' },
  documents: { label: 'Documents', icon: FileText, color: '#f59e0b' },
  gear: { label: 'Gear', icon: Compass, color: '#22c55e' },
  medical: { label: 'Medical', icon: HeartPulse, color: '#ef4444' },
  misc: { label: 'Misc', icon: Package, color: '#6b7280' },
};

const CATEGORY_ORDER: PackingCategory[] = [
  'clothing',
  'electronics',
  'toiletries',
  'documents',
  'gear',
  'medical',
  'misc',
];

export default function PackingListPanel() {
  const { activeChat, setPackingList, togglePackingItem, updatePackingItem, clearPackingList } = useChats();
  const { profile, isProfileSet } = useProfile();
  const t = useTranslations('packingList');
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<PackingCategory>>(new Set(CATEGORY_ORDER));
  const [error, setError] = useState<string | null>(null);

  const packingList = activeChat?.packingList?.items || [];
  const packedCount = packingList.filter(item => item.packed).length;
  const totalCount = packingList.length;

  // Group items by category
  const itemsByCategory = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = packingList.filter(item => item.category === cat);
    return acc;
  }, {} as Record<PackingCategory, PackingItem[]>);

  const toggleCategory = (category: PackingCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const handleGeneratePackingList = async () => {
    if (!activeChat) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/generate-packing-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: activeChat.destination,
          trip_duration: activeChat.tripContext?.tripDurationDays || 14,
          bucket_list: activeChat.bucketList?.map(item => item.text) || [],
          activities: activeChat.tripContext?.tripGoals || [],
          accommodation_style: activeChat.tripContext?.accommodationStyle || 'hostel_dorm',
          pack_weight: isProfileSet ? profile.packWeight : 'moderate',
          electronics_tolerance: isProfileSet ? profile.electronicsTolerance : 'medium',
          hygiene_threshold: isProfileSet ? profile.hygieneThreshold : 'every_3_days',
          travel_style: isProfileSet ? profile.travelStyle : 'solo',
          female_traveler_concerns: isProfileSet ? profile.femaleTravelerConcerns : false,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate packing list');
      }

      const data = await response.json();

      if (data.items && Array.isArray(data.items)) {
        setPackingList(activeChat.id, data.items);
      }
    } catch (err) {
      console.error('Error generating packing list:', err);
      setError('Failed to generate packing list. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!activeChat) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-900 rounded-lg p-4">
        <div className="text-center text-stone-400">
          <Backpack size={48} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No trip selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-stone-900 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-700 bg-stone-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Backpack size={18} className="text-orange-500" />
            <span className="font-medium">{t('title')}</span>
          </div>
          {totalCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 bg-stone-700 px-2 py-0.5 rounded-full">
                {packedCount}/{totalCount}
              </span>
              <button
                onClick={() => activeChat && clearPackingList(activeChat.id)}
                className="text-stone-500 hover:text-red-400 transition-colors"
                title="Clear packing list"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="h-1.5 rounded-full overflow-hidden bg-stone-700">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
              style={{ width: `${(packedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Generate Button */}
      <div className="px-4 py-3 border-b border-stone-800">
        <button
          onClick={handleGeneratePackingList}
          disabled={isGenerating}
          className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:from-stone-600 disabled:to-stone-600 text-white rounded-lg py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              {totalCount > 0 ? 'Regenerate Packing List' : 'Generate Packing List'}
            </>
          )}
        </button>
        <p className="text-xs text-stone-500 text-center mt-2">
          Based on your bucket list, trip settings, and profile
        </p>
        {error && (
          <p className="text-xs text-red-400 text-center mt-2">{error}</p>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto">
        {totalCount > 0 ? (
          <>
            {CATEGORY_ORDER.map(category => {
              const items = itemsByCategory[category];
              if (items.length === 0) return null;

              const config = CATEGORY_CONFIG[category];
              const Icon = config.icon;
              const isExpanded = expandedCategories.has(category);
              const categoryPacked = items.filter(i => i.packed).length;

              return (
                <div key={category} className="border-b border-stone-800">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-stone-800/50 transition-colors"
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: config.color + '20' }}
                    >
                      <span style={{ color: config.color }}><Icon size={14} /></span>
                    </div>
                    <span className="flex-1 text-left text-sm font-medium">{config.label}</span>
                    <span className="text-xs text-stone-400">{categoryPacked}/{items.length}</span>
                    {isExpanded ? <ChevronUp size={14} className="text-stone-500" /> : <ChevronDown size={14} className="text-stone-500" />}
                  </button>

                  {/* Category Items */}
                  {isExpanded && (
                    <div className="bg-stone-800/30">
                      {items.map(item => (
                        <div
                          key={item.id}
                          className={clsx(
                            "px-4 py-2 flex items-center gap-3 border-t border-stone-800/50 group",
                            item.packed ? "bg-stone-800/30" : "hover:bg-stone-800/50"
                          )}
                        >
                          {/* Checkbox */}
                          <button
                            onClick={() => activeChat && togglePackingItem(activeChat.id, item.id)}
                            className={clsx(
                              "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
                              item.packed
                                ? "bg-orange-500 border-orange-500"
                                : "border-stone-500 hover:border-orange-400"
                            )}
                          >
                            {item.packed && <Check size={12} className="text-white" />}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={clsx(
                              "text-sm",
                              item.packed && "line-through text-stone-500"
                            )}>
                              {item.name}
                            </p>
                            {item.notes && (
                              <p className="text-xs text-stone-500 mt-0.5">{item.notes}</p>
                            )}
                          </div>

                          {/* Quantity */}
                          {item.quantity > 1 && (
                            <span className="text-xs text-stone-400 bg-stone-700 px-1.5 py-0.5 rounded">
                              x{item.quantity}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        ) : (
          /* Empty State */
          <div className="p-8 text-center">
            <Backpack size={40} className="mx-auto mb-3 text-stone-600" />
            <p className="text-sm text-stone-400 mb-1">No packing list yet</p>
            <p className="text-xs text-stone-500">
              Click the button above to generate a personalized packing list
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {totalCount > 0 && packedCount === totalCount && (
        <div className="px-4 py-3 border-t border-stone-700 bg-gradient-to-r from-green-600/20 to-green-500/10">
          <p className="text-sm text-center text-green-400">
            All packed and ready to go!
          </p>
        </div>
      )}
    </div>
  );
}
