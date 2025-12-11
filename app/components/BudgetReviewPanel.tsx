"use client";

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DollarSign, Plus, Check, X, ChevronDown, ChevronUp,
  Bed, Bus, Plane, UtensilsCrossed, Mountain, FileText,
  Wifi, Bike, AlertTriangle, Edit2, Calculator, RefreshCw
} from 'lucide-react';
import clsx from 'clsx';
import { ExtractedCost, CostCategory, CostItem, TouristTrap } from '../context/ChatsContext';

// Category icons and colors (matching CostDashboard)
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

// Interface for costs that can be updated (same name, different amount)
interface UpdatableCost {
  extractedCost: ExtractedCost;
  existingItem: CostItem;
  oldTotal: number;
  newTotal: number;
}

interface BudgetReviewPanelProps {
  costs: ExtractedCost[];
  existingBudgetItems: CostItem[];
  touristTraps?: TouristTrap[];
  onAddCost: (cost: ExtractedCost) => void;
  onAddAllCosts: (costs: ExtractedCost[]) => void;
  onEditCost: (cost: ExtractedCost) => void;
  onUpdateCost?: (existingItemId: string, updates: Partial<CostItem>) => void;
  onAddTouristTrap?: (trap: TouristTrap) => void;
  tripDays?: number;
}

export default function BudgetReviewPanel({
  costs,
  existingBudgetItems,
  touristTraps = [],
  onAddCost,
  onAddAllCosts,
  onEditCost,
  onUpdateCost,
  onAddTouristTrap,
  tripDays = 14,
}: BudgetReviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [addedCosts, setAddedCosts] = useState<Set<string>>(new Set());
  const [updatedCosts, setUpdatedCosts] = useState<Set<string>>(new Set());

  // Find if a cost matches an existing budget item by name (case-insensitive)
  const findMatchingBudgetItem = (cost: ExtractedCost): CostItem | null => {
    const nameLower = cost.name.toLowerCase();
    return existingBudgetItems.find(item =>
      item.name.toLowerCase() === nameLower ||
      // Also check for similar names (e.g., "Hostel Dorms" vs "Hostel Dorm")
      item.name.toLowerCase().includes(nameLower) ||
      nameLower.includes(item.name.toLowerCase())
    ) || null;
  };

  // Categorize costs into: new, updatable (same name, different amount), and exact duplicates
  const { uniqueCosts, updatableCosts, duplicateCosts, totalNewCosts } = useMemo(() => {
    const unique: ExtractedCost[] = [];
    const updatable: UpdatableCost[] = [];
    const duplicates: ExtractedCost[] = [];

    costs.forEach(cost => {
      const nameLower = cost.name.toLowerCase();

      // Skip if just added in this session
      if (addedCosts.has(nameLower)) {
        duplicates.push(cost);
        return;
      }

      // Check for matching existing item
      const matchingItem = findMatchingBudgetItem(cost);

      if (matchingItem) {
        const existingTotal = matchingItem.amount * matchingItem.quantity;
        const newTotal = cost.amount * cost.quantity;

        // If amounts are significantly different (more than $5 or 10% difference), mark as updatable
        const difference = Math.abs(existingTotal - newTotal);
        const percentDiff = existingTotal > 0 ? difference / existingTotal : 1;

        if (difference > 5 && percentDiff > 0.1) {
          updatable.push({
            extractedCost: cost,
            existingItem: matchingItem,
            oldTotal: existingTotal,
            newTotal: newTotal,
          });
        } else {
          // Same amount - true duplicate
          duplicates.push(cost);
        }
      } else {
        // No matching item - new cost
        unique.push(cost);
      }
    });

    const total = unique.reduce((sum, cost) => sum + (cost.amount * cost.quantity), 0);

    return { uniqueCosts: unique, updatableCosts: updatable, duplicateCosts: duplicates, totalNewCosts: total };
  }, [costs, existingBudgetItems, addedCosts]);

  // Handle adding a single cost
  const handleAddCost = (cost: ExtractedCost) => {
    onAddCost(cost);
    setAddedCosts(prev => new Set([...prev, cost.name.toLowerCase()]));
  };

  // Handle adding all new costs
  const handleAddAllCosts = () => {
    onAddAllCosts(uniqueCosts);
    setAddedCosts(prev => {
      const newSet = new Set(prev);
      uniqueCosts.forEach(c => newSet.add(c.name.toLowerCase()));
      return newSet;
    });
  };

  // Handle updating an existing cost with new values
  const handleUpdateCost = (updatable: UpdatableCost) => {
    if (!onUpdateCost) return;

    const { extractedCost, existingItem } = updatable;

    // Determine if this is a recurring cost based on unit
    const isRecurring = ['night', 'nights', 'day', 'days'].includes(extractedCost.unit);
    const perDay = isRecurring ? (extractedCost.quantity / tripDays) : undefined;

    onUpdateCost(existingItem.id, {
      amount: extractedCost.amount,
      quantity: extractedCost.quantity,
      unit: extractedCost.unit,
      notes: extractedCost.notes,
      isRecurring,
      perDay,
    });

    setUpdatedCosts(prev => new Set([...prev, extractedCost.name.toLowerCase()]));
  };

  // Handle updating all updatable costs at once
  const handleUpdateAllCosts = () => {
    updatableCosts.forEach(updatable => {
      if (!updatedCosts.has(updatable.extractedCost.name.toLowerCase())) {
        handleUpdateCost(updatable);
      }
    });
  };

  if (costs.length === 0 && touristTraps.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 bg-gradient-to-r from-green-900/30 to-emerald-900/20 border border-green-500/30 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-green-900/20 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Calculator size={18} className="text-green-400" />
          <span className="text-sm font-semibold text-green-300">
            Budget Items Detected ({costs.length})
          </span>
          {uniqueCosts.length > 0 && (
            <span className="text-xs bg-green-600/30 text-green-400 px-2 py-0.5 rounded-full">
              ${totalNewCosts.toFixed(0)} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {updatableCosts.length > 0 && (
            <span className="text-xs bg-amber-600/30 text-amber-400 px-2 py-0.5 rounded-full">
              {updatableCosts.length} can update
            </span>
          )}
          {duplicateCosts.length > 0 && (
            <span className="text-xs text-stone-500">
              {duplicateCosts.length} already in budget
            </span>
          )}
          {isExpanded ? <ChevronUp size={16} className="text-stone-500" /> : <ChevronDown size={16} className="text-stone-500" />}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 pb-4 space-y-3">
              {/* New costs to add */}
              {uniqueCosts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-400 uppercase font-bold">New Costs</span>
                    <button
                      onClick={handleAddAllCosts}
                      className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus size={12} />
                      Add All (${totalNewCosts.toFixed(0)})
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {uniqueCosts.map((cost, idx) => {
                      const config = CATEGORY_CONFIG[cost.category] || CATEGORY_CONFIG.misc;
                      const Icon = config.icon;
                      const isAdded = addedCosts.has(cost.name.toLowerCase());

                      return (
                        <div
                          key={`${cost.name}-${idx}`}
                          className={clsx(
                            "flex items-center gap-3 p-2 rounded-lg transition-all",
                            isAdded ? "bg-green-600/10 opacity-60" : "bg-stone-800/50 hover:bg-stone-800"
                          )}
                        >
                          {/* Category Icon */}
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: config.color + '20', color: config.color }}
                          >
                            <Icon size={14} />
                          </div>

                          {/* Cost Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{cost.name}</span>
                              {cost.is_range && (
                                <span className="text-[10px] bg-amber-600/20 text-amber-400 px-1.5 py-0.5 rounded">
                                  range
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-stone-500 truncate">{cost.notes}</p>
                          </div>

                          {/* Amount */}
                          <div className="text-right">
                            <span className="text-sm font-bold text-green-400">
                              ${(cost.amount * cost.quantity).toFixed(0)}
                            </span>
                            {cost.quantity > 1 && (
                              <p className="text-[10px] text-stone-500">
                                ${cost.amount} × {cost.quantity}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            {isAdded ? (
                              <span className="p-1.5 text-green-400">
                                <Check size={14} />
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => onEditCost(cost)}
                                  className="p-1.5 text-stone-400 hover:text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                                  title="Edit before adding"
                                >
                                  <Edit2 size={14} />
                                </button>
                                <button
                                  onClick={() => handleAddCost(cost)}
                                  className="p-1.5 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded transition-colors"
                                  title="Add to budget"
                                >
                                  <Plus size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Updatable costs (same name, different amount) */}
              {updatableCosts.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-stone-700/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-400 uppercase font-bold flex items-center gap-1">
                      <RefreshCw size={12} />
                      Update Budget
                    </span>
                    {onUpdateCost && updatableCosts.filter(u => !updatedCosts.has(u.extractedCost.name.toLowerCase())).length > 1 && (
                      <button
                        onClick={handleUpdateAllCosts}
                        className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <RefreshCw size={12} />
                        Update All
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-stone-500 -mt-1">
                    Trip length changed? These costs have different amounts:
                  </p>

                  <div className="space-y-1.5">
                    {updatableCosts.map((updatable, idx) => {
                      const { extractedCost, existingItem, oldTotal, newTotal } = updatable;
                      const config = CATEGORY_CONFIG[extractedCost.category] || CATEGORY_CONFIG.misc;
                      const Icon = config.icon;
                      const isUpdated = updatedCosts.has(extractedCost.name.toLowerCase());
                      const difference = newTotal - oldTotal;
                      const isIncrease = difference > 0;

                      return (
                        <div
                          key={`updatable-${extractedCost.name}-${idx}`}
                          className={clsx(
                            "flex items-center gap-3 p-2 rounded-lg transition-all",
                            isUpdated ? "bg-amber-600/10 opacity-60" : "bg-stone-800/50 hover:bg-stone-800"
                          )}
                        >
                          {/* Category Icon */}
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: config.color + '20', color: config.color }}
                          >
                            <Icon size={14} />
                          </div>

                          {/* Cost Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{extractedCost.name}</span>
                            </div>
                            <p className="text-xs text-stone-500">
                              {existingItem.quantity} {existingItem.unit} → {extractedCost.quantity} {extractedCost.unit}
                            </p>
                          </div>

                          {/* Amount comparison */}
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-stone-500 line-through">
                                ${oldTotal.toFixed(0)}
                              </span>
                              <span className="text-sm font-bold text-amber-400">
                                ${newTotal.toFixed(0)}
                              </span>
                            </div>
                            <p className={clsx(
                              "text-[10px]",
                              isIncrease ? "text-red-400" : "text-green-400"
                            )}>
                              {isIncrease ? '+' : ''}{difference.toFixed(0)}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            {isUpdated ? (
                              <span className="p-1.5 text-amber-400">
                                <Check size={14} />
                              </span>
                            ) : onUpdateCost ? (
                              <button
                                onClick={() => handleUpdateCost(updatable)}
                                className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/20 rounded transition-colors"
                                title="Update in budget"
                              >
                                <RefreshCw size={14} />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Already in budget (collapsed by default) */}
              {duplicateCosts.length > 0 && (
                <div className="pt-2 border-t border-stone-700/50">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <Check size={12} />
                    <span>{duplicateCosts.length} cost{duplicateCosts.length > 1 ? 's' : ''} already in your budget:</span>
                    <span className="text-stone-600">
                      {duplicateCosts.slice(0, 3).map(c => c.name).join(', ')}
                      {duplicateCosts.length > 3 && ` +${duplicateCosts.length - 3} more`}
                    </span>
                  </div>
                </div>
              )}

              {/* Tourist Traps Warning */}
              {touristTraps.length > 0 && (
                <div className="pt-2 border-t border-stone-700/50">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-xs text-red-400 uppercase font-bold">Tourist Traps to Avoid</span>
                  </div>
                  <div className="space-y-1.5">
                    {touristTraps.map((trap, idx) => (
                      <div
                        key={`trap-${idx}`}
                        className="flex items-start gap-2 p-2 bg-red-500/10 rounded-lg"
                      >
                        <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-red-300">{trap.name}</p>
                          <p className="text-xs text-stone-400">{trap.description}</p>
                          {trap.location && (
                            <p className="text-xs text-stone-500 mt-0.5">📍 {trap.location}</p>
                          )}
                        </div>
                        {onAddTouristTrap && (
                          <button
                            onClick={() => onAddTouristTrap(trap)}
                            className="p-1 text-stone-400 hover:text-red-400 hover:bg-red-500/20 rounded transition-colors"
                            title="Save warning"
                          >
                            <Plus size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All costs added state */}
              {uniqueCosts.length === 0 && updatableCosts.length === 0 && duplicateCosts.length > 0 && touristTraps.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-2 text-green-400">
                  <Check size={16} />
                  <span className="text-sm">All costs already in your budget!</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
