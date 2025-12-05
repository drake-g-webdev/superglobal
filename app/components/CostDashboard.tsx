"use client";

import { useState, useMemo } from 'react';
import {
  DollarSign, Bed, Bus, Plane, UtensilsCrossed, Mountain, FileText,
  Wifi, Bike, AlertTriangle, Plus, Trash2, Edit2, Check, X, Calculator,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';
import { useChats, CostCategory, CostItem, TouristTrap } from '../context/ChatsContext';
import { useTranslations } from '../context/LocaleContext';
import { Users } from 'lucide-react';

// Categories where cost is per-person (tickets, flights, activities, food)
// NOTE: Accommodation is NOT included - shared costs like apartment rentals should not be multiplied
const PER_PERSON_CATEGORIES: CostCategory[] = [
  'transport_flights',
  'activities',
  'food',
  'visa_border',
];

const CATEGORY_CONFIG: Record<CostCategory, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  accommodation: { label: 'Accommodation', icon: Bed, color: '#f97316' },
  transport_local: { label: 'Local Transport', icon: Bus, color: '#3b82f6' },
  transport_flights: { label: 'Flights', icon: Plane, color: '#8b5cf6' },
  food: { label: 'Food & Drinks', icon: UtensilsCrossed, color: '#ef4444' },
  activities: { label: 'Activities', icon: Mountain, color: '#22c55e' },
  visa_border: { label: 'Visa & Border', icon: FileText, color: '#f59e0b' },
  sim_connectivity: { label: 'SIM & Internet', icon: Wifi, color: '#06b6d4' },
  moped_rental: { label: 'Moped Rental', icon: Bike, color: '#ec4899' },
  misc: { label: 'Miscellaneous', icon: DollarSign, color: '#6b7280' },
};

const CATEGORY_ORDER: CostCategory[] = [
  'accommodation',
  'transport_local',
  'transport_flights',
  'food',
  'activities',
  'visa_border',
  'sim_connectivity',
  'moped_rental',
  'misc',
];

interface AddCostFormState {
  category: CostCategory;
  name: string;
  amount: string;
  quantity: string;
  unit: string;
  notes: string;
}

const defaultFormState: AddCostFormState = {
  category: 'accommodation',
  name: '',
  amount: '',
  quantity: '1',
  unit: 'trip',
  notes: '',
};

export default function CostDashboard() {
  const { activeChat, addCostItem, updateCostItem, removeCostItem, clearCostItems, removeTouristTrap } = useChats();
  const t = useTranslations('costs');
  const [isAddingCost, setIsAddingCost] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formState, setFormState] = useState<AddCostFormState>(defaultFormState);
  const [expandedCategories, setExpandedCategories] = useState<Set<CostCategory>>(new Set(CATEGORY_ORDER));
  const [showTraps, setShowTraps] = useState(true);
  const [applyTravelerMultiplier, setApplyTravelerMultiplier] = useState(true);

  const costs = activeChat?.tripCosts?.items || [];
  const touristTraps = activeChat?.touristTraps || [];
  const tripDays = activeChat?.tripContext?.tripDurationDays || 14;

  // Get traveler count from trip context (per-trip setting)
  const travelerCount = activeChat?.tripContext?.travelerCount || 1;
  const travelerLabel = travelerCount === 1 ? 'Solo' : travelerCount === 2 ? 'Couple' : `Group of ${travelerCount}`;

  // Helper to calculate item cost with traveler multiplier
  const getItemCost = (item: CostItem) => {
    const baseCost = item.amount * item.quantity;
    // Apply multiplier only to per-person categories and if toggle is on
    if (applyTravelerMultiplier && PER_PERSON_CATEGORIES.includes(item.category) && travelerCount > 1) {
      return baseCost * travelerCount;
    }
    return baseCost;
  };

  // Calculate totals by category (with traveler multiplier)
  const categoryTotals = useMemo(() => {
    const totals: Record<CostCategory, number> = {} as Record<CostCategory, number>;
    CATEGORY_ORDER.forEach(cat => totals[cat] = 0);

    costs.forEach(item => {
      totals[item.category] += getItemCost(item);
    });

    return totals;
  }, [costs, applyTravelerMultiplier, travelerCount]);

  // Calculate grand total
  const grandTotal = useMemo(() => {
    return Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
  }, [categoryTotals]);

  // Calculate daily average
  const dailyAverage = useMemo(() => {
    return tripDays > 0 ? grandTotal / tripDays : 0;
  }, [grandTotal, tripDays]);

  // Calculate cost per person (total / travelers)
  const costPerPerson = useMemo(() => {
    return travelerCount > 1 ? grandTotal / travelerCount : grandTotal;
  }, [grandTotal, travelerCount]);

  // Items grouped by category
  const itemsByCategory = useMemo(() => {
    const grouped: Record<CostCategory, CostItem[]> = {} as Record<CostCategory, CostItem[]>;
    CATEGORY_ORDER.forEach(cat => grouped[cat] = []);

    costs.forEach(item => {
      grouped[item.category].push(item);
    });

    return grouped;
  }, [costs]);

  const handleAddCost = () => {
    if (!activeChat || !formState.name || !formState.amount) return;

    addCostItem(activeChat.id, {
      category: formState.category,
      name: formState.name,
      amount: parseFloat(formState.amount) || 0,
      quantity: parseFloat(formState.quantity) || 1,
      unit: formState.unit,
      notes: formState.notes || undefined,
      isEstimate: false,
    });

    setFormState(defaultFormState);
    setIsAddingCost(false);
  };

  const handleUpdateCost = (itemId: string) => {
    if (!activeChat || !formState.name || !formState.amount) return;

    updateCostItem(activeChat.id, itemId, {
      category: formState.category,
      name: formState.name,
      amount: parseFloat(formState.amount) || 0,
      quantity: parseFloat(formState.quantity) || 1,
      unit: formState.unit,
      notes: formState.notes || undefined,
    });

    setEditingItemId(null);
    setFormState(defaultFormState);
  };

  const startEditing = (item: CostItem) => {
    setEditingItemId(item.id);
    setFormState({
      category: item.category,
      name: item.name,
      amount: item.amount.toString(),
      quantity: item.quantity.toString(),
      unit: item.unit,
      notes: item.notes || '',
    });
  };

  const toggleCategory = (category: CostCategory) => {
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

  if (!activeChat) {
    return (
      <div className="h-full flex items-center justify-center bg-stone-900 rounded-lg p-4">
        <div className="text-center text-stone-400">
          <Calculator size={48} className="mx-auto mb-2 opacity-50" />
          <p className="text-sm">No trip selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-stone-900 overflow-hidden">
      {/* Header with Total */}
      <div className="px-4 py-3 border-b border-stone-700 bg-stone-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calculator size={18} className="text-orange-500" />
            <span className="font-medium">{t('title')}</span>
          </div>
          <button
            onClick={() => activeChat && clearCostItems(activeChat.id)}
            className="text-xs text-stone-500 hover:text-red-400 transition-colors"
            title="Clear all costs"
          >
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Traveler count indicator */}
        {travelerCount > 1 && (
          <button
            onClick={() => setApplyTravelerMultiplier(!applyTravelerMultiplier)}
            className={clsx(
              "mb-2 w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs transition-colors",
              applyTravelerMultiplier
                ? "bg-blue-600/20 border border-blue-500/30 text-blue-400"
                : "bg-stone-700/50 border border-stone-600 text-stone-400"
            )}
          >
            <Users size={12} />
            {applyTravelerMultiplier
              ? `${travelerLabel} (${travelerCount}x for tickets/flights/food)`
              : `${travelerLabel} mode off - showing per-person`
            }
          </button>
        )}

        {/* Total Display */}
        <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/10 rounded-lg p-3 border border-orange-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-stone-400">{t('totalSpent')}{travelerCount > 1 && applyTravelerMultiplier ? ` (${travelerCount} travelers)` : ''}</p>
              <p className="text-2xl font-bold text-white">${grandTotal.toFixed(0)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-400">{tripDays} {t('category') === 'Categoría' ? 'días' : 'days'}</p>
              <p className="text-lg font-semibold text-orange-400">${dailyAverage.toFixed(0)}/{t('dailyAverage').split(' ')[0].toLowerCase()}</p>
            </div>
          </div>

          {/* Cost per person (only show when traveling with others) */}
          {travelerCount > 1 && (
            <div className="mt-2 pt-2 border-t border-orange-500/20 flex items-center justify-between">
              <span className="text-xs text-stone-400">Cost per person</span>
              <span className="text-sm font-medium text-blue-400">${costPerPerson.toFixed(0)} each</span>
            </div>
          )}

          {/* Mini category breakdown bar */}
          {grandTotal > 0 && (
            <div className="mt-3 h-2 rounded-full overflow-hidden flex bg-stone-700">
              {CATEGORY_ORDER.map(cat => {
                const pct = (categoryTotals[cat] / grandTotal) * 100;
                if (pct < 1) return null;
                return (
                  <div
                    key={cat}
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: CATEGORY_CONFIG[cat].color }}
                    title={`${CATEGORY_CONFIG[cat].label}: $${categoryTotals[cat].toFixed(0)}`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cost Items List */}
      <div className="flex-1 overflow-y-auto">
        {/* Add Cost Button */}
        {!isAddingCost && (
          <button
            onClick={() => setIsAddingCost(true)}
            className="w-full px-4 py-3 flex items-center gap-2 text-orange-400 hover:bg-stone-800 transition-colors border-b border-stone-800"
          >
            <Plus size={16} />
            <span className="text-sm">{t('addExpense')}</span>
          </button>
        )}

        {/* Add Cost Form */}
        {isAddingCost && (
          <div className="p-4 border-b border-stone-700 bg-stone-800/50">
            <div className="space-y-3">
              {/* Category Select */}
              <div>
                <label className="block text-xs text-stone-400 mb-1">{t('category')}</label>
                <select
                  value={formState.category}
                  onChange={e => setFormState(s => ({ ...s, category: e.target.value as CostCategory }))}
                  className="w-full bg-stone-700 border border-stone-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  {CATEGORY_ORDER.map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].label}</option>
                  ))}
                </select>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs text-stone-400 mb-1">Name</label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={e => setFormState(s => ({ ...s, name: e.target.value }))}
                  placeholder="e.g., Hostel dorms"
                  className="w-full bg-stone-700 border border-stone-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Amount & Quantity */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">{t('amount')} ($)</label>
                  <input
                    type="number"
                    value={formState.amount}
                    onChange={e => setFormState(s => ({ ...s, amount: e.target.value }))}
                    placeholder="15"
                    className="w-full bg-stone-700 border border-stone-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Qty</label>
                  <input
                    type="number"
                    value={formState.quantity}
                    onChange={e => setFormState(s => ({ ...s, quantity: e.target.value }))}
                    placeholder="14"
                    className="w-full bg-stone-700 border border-stone-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Unit</label>
                  <select
                    value={formState.unit}
                    onChange={e => setFormState(s => ({ ...s, unit: e.target.value }))}
                    className="w-full bg-stone-700 border border-stone-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                  >
                    <option value="night">night</option>
                    <option value="day">day</option>
                    <option value="week">week</option>
                    <option value="month">month</option>
                    <option value="meal">meal</option>
                    <option value="trip">trip</option>
                    <option value="person">person</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-stone-400 mb-1">{t('description')}</label>
                <input
                  type="text"
                  value={formState.notes}
                  onChange={e => setFormState(s => ({ ...s, notes: e.target.value }))}
                  placeholder="e.g., Based on Hostelworld average"
                  className="w-full bg-stone-700 border border-stone-600 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleAddCost}
                  disabled={!formState.name || !formState.amount}
                  className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-600 disabled:cursor-not-allowed text-white rounded py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <Check size={14} />
                  Add
                </button>
                <button
                  onClick={() => { setIsAddingCost(false); setFormState(defaultFormState); }}
                  className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded text-sm transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Categories */}
        {CATEGORY_ORDER.map(category => {
          const items = itemsByCategory[category];
          const total = categoryTotals[category];
          const config = CATEGORY_CONFIG[category];
          const Icon = config.icon;
          const isExpanded = expandedCategories.has(category);

          if (items.length === 0 && total === 0) return null;

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
                <span className="text-sm text-stone-400">${total.toFixed(0)}</span>
                {isExpanded ? <ChevronUp size={14} className="text-stone-500" /> : <ChevronDown size={14} className="text-stone-500" />}
              </button>

              {/* Category Items */}
              {isExpanded && items.length > 0 && (
                <div className="bg-stone-800/30">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="px-4 py-2 flex items-center gap-3 border-t border-stone-800/50 hover:bg-stone-800/50 group"
                    >
                      {editingItemId === item.id ? (
                        // Inline edit form
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={formState.name}
                            onChange={e => setFormState(s => ({ ...s, name: e.target.value }))}
                            className="flex-1 bg-stone-700 border border-stone-600 rounded px-2 py-1 text-sm"
                          />
                          <input
                            type="number"
                            value={formState.amount}
                            onChange={e => setFormState(s => ({ ...s, amount: e.target.value }))}
                            className="w-16 bg-stone-700 border border-stone-600 rounded px-2 py-1 text-sm"
                          />
                          <span className="text-stone-500">x</span>
                          <input
                            type="number"
                            value={formState.quantity}
                            onChange={e => setFormState(s => ({ ...s, quantity: e.target.value }))}
                            className="w-12 bg-stone-700 border border-stone-600 rounded px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => handleUpdateCost(item.id)}
                            className="p-1 text-green-400 hover:bg-green-500/20 rounded"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => { setEditingItemId(null); setFormState(defaultFormState); }}
                            className="p-1 text-stone-400 hover:bg-stone-600 rounded"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{item.name}</p>
                            <p className="text-xs text-stone-500">
                              ${item.amount} × {item.quantity} {item.unit}
                              {applyTravelerMultiplier && PER_PERSON_CATEGORIES.includes(item.category) && travelerCount > 1 && (
                                <span className="ml-1 text-blue-400">× {travelerCount}</span>
                              )}
                              {item.isEstimate && <span className="ml-1 text-orange-400">(est)</span>}
                            </p>
                          </div>
                          <span className="text-sm font-medium">${getItemCost(item).toFixed(0)}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditing(item)}
                              className="p-1 text-stone-400 hover:text-blue-400 hover:bg-blue-500/20 rounded"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => activeChat && removeCostItem(activeChat.id, item.id)}
                              className="p-1 text-stone-400 hover:text-red-400 hover:bg-red-500/20 rounded"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty State */}
        {costs.length === 0 && !isAddingCost && (
          <div className="p-8 text-center">
            <DollarSign size={40} className="mx-auto mb-3 text-stone-600" />
            <p className="text-sm text-stone-400 mb-1">No costs tracked yet</p>
            <p className="text-xs text-stone-500">
              Ask Sierra about costs or add them manually above
            </p>
          </div>
        )}

        {/* Tourist Traps Section */}
        {touristTraps.length > 0 && (
          <div className="border-t border-stone-700 mt-2">
            <button
              onClick={() => setShowTraps(!showTraps)}
              className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-stone-800/50 transition-colors"
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 bg-red-500/20">
                <AlertTriangle size={14} className="text-red-400" />
              </div>
              <span className="flex-1 text-left text-sm font-medium text-red-400">Tourist Traps to Avoid</span>
              <span className="text-xs text-stone-400 bg-red-500/20 px-2 py-0.5 rounded-full">{touristTraps.length}</span>
              {showTraps ? <ChevronUp size={14} className="text-stone-500" /> : <ChevronDown size={14} className="text-stone-500" />}
            </button>

            {showTraps && (
              <div className="bg-red-500/5">
                {touristTraps.map(trap => (
                  <div
                    key={trap.id}
                    className="px-4 py-2 border-t border-stone-800/50 hover:bg-stone-800/30 group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-300">{trap.name}</p>
                        <p className="text-xs text-stone-400 mt-0.5">{trap.description}</p>
                        {trap.location && (
                          <p className="text-xs text-stone-500 mt-0.5">📍 {trap.location}</p>
                        )}
                      </div>
                      <button
                        onClick={() => activeChat && removeTouristTrap(activeChat.id, trap.id)}
                        className="p-1 text-stone-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer with budget comparison */}
      {activeChat.tripContext?.dailyBudgetTarget > 0 && (
        <div className="px-4 py-3 border-t border-stone-700 bg-stone-800/50">
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-400">vs Target (${activeChat.tripContext.dailyBudgetTarget}/day)</span>
            {dailyAverage <= activeChat.tripContext.dailyBudgetTarget ? (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <TrendingDown size={12} />
                ${(activeChat.tripContext.dailyBudgetTarget - dailyAverage).toFixed(0)} under
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <TrendingUp size={12} />
                ${(dailyAverage - activeChat.tripContext.dailyBudgetTarget).toFixed(0)} over
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
