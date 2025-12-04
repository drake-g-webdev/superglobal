"use client";

import { useState } from 'react';
import {
  ListChecks, Plus, Trash2, Check, X, Star,
  Camera, Utensils, Mountain, Landmark, Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import { useChats, BucketListItem } from '../context/ChatsContext';

type BucketCategory = BucketListItem['category'];

const CATEGORY_CONFIG: Record<NonNullable<BucketCategory>, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  experience: { label: 'Experience', icon: Sparkles, color: '#f97316' },
  food: { label: 'Food', icon: Utensils, color: '#ef4444' },
  adventure: { label: 'Adventure', icon: Mountain, color: '#22c55e' },
  culture: { label: 'Culture', icon: Landmark, color: '#8b5cf6' },
  photography: { label: 'Photography', icon: Camera, color: '#3b82f6' },
  other: { label: 'Other', icon: Star, color: '#6b7280' },
};

const CATEGORY_ORDER: NonNullable<BucketCategory>[] = [
  'experience',
  'adventure',
  'food',
  'culture',
  'photography',
  'other',
];

export default function BucketListPanel() {
  const { activeChat, addBucketListItem, toggleBucketListItem, removeBucketListItem } = useChats();
  const [isAdding, setIsAdding] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<NonNullable<BucketCategory>>('experience');

  const bucketList = activeChat?.bucketList || [];
  const completedCount = bucketList.filter(item => item.completed).length;
  const totalCount = bucketList.length;

  const handleAdd = () => {
    if (!activeChat || !newItemText.trim()) return;

    addBucketListItem(activeChat.id, {
      text: newItemText.trim(),
      completed: false,
      category: newItemCategory,
    });

    setNewItemText('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewItemText('');
    }
  };

  if (!activeChat) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-900 rounded-lg p-4">
        <div className="text-center text-stone-400">
          <ListChecks size={48} className="mx-auto mb-2 opacity-50" />
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
            <ListChecks size={18} className="text-orange-500" />
            <span className="font-medium">Trip Bucket List</span>
          </div>
          {totalCount > 0 && (
            <span className="text-xs text-stone-400 bg-stone-700 px-2 py-0.5 rounded-full">
              {completedCount}/{totalCount}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className="h-1.5 rounded-full overflow-hidden bg-stone-700">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto">
        {/* Add Button */}
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full px-4 py-3 flex items-center gap-2 text-orange-400 hover:bg-stone-800 transition-colors border-b border-stone-800"
          >
            <Plus size={16} />
            <span className="text-sm">Add bucket list item</span>
          </button>
        )}

        {/* Add Form */}
        {isAdding && (
          <div className="p-4 border-b border-stone-700 bg-stone-800/50">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-stone-400 mb-1">What do you want to do?</label>
                <input
                  type="text"
                  value={newItemText}
                  onChange={e => setNewItemText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., Watch sunrise at Angkor Wat"
                  autoFocus
                  className="w-full bg-stone-700 border border-stone-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_ORDER.map(cat => {
                    const config = CATEGORY_CONFIG[cat];
                    const Icon = config.icon;
                    const isSelected = newItemCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setNewItemCategory(cat)}
                        className={clsx(
                          "px-2.5 py-1 rounded-full text-xs flex items-center gap-1 transition-all",
                          isSelected
                            ? "ring-1 ring-offset-1 ring-offset-stone-800"
                            : "opacity-60 hover:opacity-100"
                        )}
                        style={{
                          backgroundColor: isSelected ? config.color + '30' : 'transparent',
                          color: config.color,
                          borderColor: config.color,
                          ...(isSelected ? { ringColor: config.color } : {}),
                        }}
                      >
                        <Icon size={12} />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!newItemText.trim()}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-600 disabled:cursor-not-allowed text-white rounded py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <Check size={14} />
                  Add
                </button>
                <button
                  onClick={() => { setIsAdding(false); setNewItemText(''); }}
                  className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded text-sm transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bucket List Items */}
        <div className="divide-y divide-stone-800">
          {bucketList.map(item => {
            const category = item.category || 'other';
            const config = CATEGORY_CONFIG[category];
            const Icon = config.icon;

            return (
              <div
                key={item.id}
                className={clsx(
                  "px-4 py-3 flex items-start gap-3 group transition-colors",
                  item.completed ? "bg-stone-800/30" : "hover:bg-stone-800/50"
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={() => activeChat && toggleBucketListItem(activeChat.id, item.id)}
                  className={clsx(
                    "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                    item.completed
                      ? "bg-orange-500 border-orange-500"
                      : "border-stone-500 hover:border-orange-400"
                  )}
                >
                  {item.completed && <Check size={12} className="text-white" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={clsx(
                    "text-sm",
                    item.completed && "line-through text-stone-500"
                  )}>
                    {item.text}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Icon size={10} style={{ color: config.color }} />
                    <span className="text-xs text-stone-500">{config.label}</span>
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => activeChat && removeBucketListItem(activeChat.id, item.id)}
                  className="p-1 text-stone-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {bucketList.length === 0 && !isAdding && (
          <div className="p-8 text-center">
            <Star size={40} className="mx-auto mb-3 text-stone-600" />
            <p className="text-sm text-stone-400 mb-1">No bucket list items yet</p>
            <p className="text-xs text-stone-500">
              Add things you want to experience on this trip
            </p>
          </div>
        )}
      </div>

      {/* Footer with encouragement */}
      {totalCount > 0 && completedCount === totalCount && (
        <div className="px-4 py-3 border-t border-stone-700 bg-gradient-to-r from-orange-600/20 to-orange-500/10">
          <p className="text-sm text-center text-orange-400">
            You&apos;ve completed your bucket list! Time for a new adventure?
          </p>
        </div>
      )}
    </div>
  );
}
