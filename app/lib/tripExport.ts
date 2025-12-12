"use client";

import jsPDF from 'jspdf';
import type {
  Chat,
  MapPin,
  CostItem,
  PackingItem,
  TripCosts,
  ItineraryStop,
  CostCategory
} from '../context/ChatsContext';

// Brand colors
const COLORS = {
  orange: '#ea580c',
  orangeLight: '#f97316',
  stone900: '#1c1917',
  stone800: '#292524',
  stone700: '#44403c',
  stone600: '#57534e',
  stone500: '#78716c',
  stone400: '#a8a29e',
  stone300: '#d6d3d1',
  stone200: '#e7e5e4',
  stone100: '#f5f5f4',
  white: '#ffffff',
  green: '#22c55e',
  red: '#ef4444',
  blue: '#3b82f6',
};

// Category icons as text
const CATEGORY_LABELS: Record<CostCategory, string> = {
  accommodation: 'Accommodation',
  transport_local: 'Local Transport',
  transport_flights: 'Flights',
  food: 'Food & Drinks',
  activities: 'Activities',
  visa_border: 'Visa & Border',
  sim_connectivity: 'SIM & Internet',
  moped_rental: 'Moped Rental',
  misc: 'Miscellaneous',
};

const PACKING_CATEGORY_LABELS: Record<string, string> = {
  clothing: 'Clothing',
  electronics: 'Electronics',
  toiletries: 'Toiletries',
  documents: 'Documents',
  gear: 'Gear',
  medical: 'Medical',
  misc: 'Miscellaneous',
};

interface ExportOptions {
  includeMap: boolean;
  includeBudget: boolean;
  includePackingList: boolean;
  includeItinerary: boolean;
  includeSummary: boolean;
}

// Generate AI summary of the trip from chat messages
export async function generateTripSummary(chat: Chat): Promise<string> {
  // Extract key information from the chat
  const destination = chat.destination;
  const duration = chat.tripContext.tripDurationDays;
  const startDate = chat.tripContext.startDate;
  const travelers = chat.tripContext.travelerCount;
  const budget = chat.tripContext.dailyBudgetTarget;
  const stops = chat.tripContext.itineraryBreakdown;
  const goals = chat.tripContext.tripGoals;

  // Build a summary from available data
  let summary = '';

  // Opening
  if (destination && destination !== 'General') {
    summary += `Your adventure to ${destination} awaits! `;
  } else {
    summary += `Your adventure awaits! `;
  }

  // Duration and dates
  if (duration) {
    summary += `This ${duration}-day journey `;
    if (startDate) {
      const date = new Date(startDate);
      summary += `beginning ${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} `;
    }
  }

  // Travelers
  if (travelers === 1) {
    summary += `is a solo expedition `;
  } else if (travelers === 2) {
    summary += `is perfect for two `;
  } else if (travelers > 2) {
    summary += `brings together ${travelers} travelers `;
  }

  // Budget style
  if (budget) {
    if (budget <= 30) {
      summary += `on a true broke backpacker budget of $${budget}/day. `;
    } else if (budget <= 50) {
      summary += `with a comfortable backpacker budget of $${budget}/day. `;
    } else {
      summary += `with a generous daily budget of $${budget}. `;
    }
  }

  // Itinerary highlights
  if (stops.length > 0) {
    summary += `\n\nYour route takes you through ${stops.map(s => s.location).join(', ')}. `;

    // Add notes if any stops have them
    const stopsWithNotes = stops.filter(s => s.notes);
    if (stopsWithNotes.length > 0) {
      summary += `Highlights include ${stopsWithNotes[0].notes}. `;
    }
  }

  // Trip goals
  if (goals.length > 0) {
    const goalLabels: Record<string, string> = {
      surf_progression: 'catching waves',
      volunteering: 'giving back to local communities',
      trekking_altitude: 'conquering mountain trails',
      remote_work: 'balancing work and adventure',
      nightlife: 'experiencing the local nightlife',
      cultural_immersion: 'diving deep into local culture',
      dating_forward: 'meeting new people',
      cheap_adventure: 'finding budget-friendly thrills',
      photography: 'capturing stunning moments',
      food_mission: 'exploring local cuisine',
      spiritual_journey: 'finding inner peace',
      language_learning: 'picking up a new language',
    };

    const goalDescriptions = goals
      .filter(g => g !== 'custom')
      .map(g => goalLabels[g] || g)
      .slice(0, 3);

    if (goalDescriptions.length > 0) {
      summary += `This trip is all about ${goalDescriptions.join(', ')}. `;
    }
  }

  // Closing
  summary += `\n\nPack light, travel far, and make memories that last a lifetime. Safe travels!`;

  return summary;
}

// Calculate map bounds to fit all pins
function calculateMapBounds(pins: MapPin[]): { center: [number, number]; zoom: number; bounds: string } {
  if (pins.length === 0) {
    return { center: [0, 20], zoom: 2, bounds: '' };
  }

  if (pins.length === 1) {
    const pin = pins[0];
    return {
      center: [pin.coordinates[0], pin.coordinates[1]],
      zoom: 12,
      bounds: `${pin.coordinates[0]},${pin.coordinates[1]},${pin.coordinates[0]},${pin.coordinates[1]}`
    };
  }

  // Calculate bounding box
  let minLng = pins[0].coordinates[0];
  let maxLng = pins[0].coordinates[0];
  let minLat = pins[0].coordinates[1];
  let maxLat = pins[0].coordinates[1];

  for (const pin of pins) {
    minLng = Math.min(minLng, pin.coordinates[0]);
    maxLng = Math.max(maxLng, pin.coordinates[0]);
    minLat = Math.min(minLat, pin.coordinates[1]);
    maxLat = Math.max(maxLat, pin.coordinates[1]);
  }

  // Add padding (10% on each side)
  const lngPadding = (maxLng - minLng) * 0.1;
  const latPadding = (maxLat - minLat) * 0.1;

  minLng -= lngPadding;
  maxLng += lngPadding;
  minLat -= latPadding;
  maxLat += latPadding;

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  return {
    center: [centerLng, centerLat],
    zoom: 6, // Default zoom, Mapbox static will auto-fit to bounds
    bounds: `[${minLng},${minLat},${maxLng},${maxLat}]`
  };
}

// Generate static map URL using Mapbox Static Images API
function generateStaticMapUrl(pins: MapPin[], mapboxToken: string): string {
  if (!mapboxToken || pins.length === 0) {
    return '';
  }

  const { bounds } = calculateMapBounds(pins);

  // Build markers string
  // Mapbox static format: pin-s+color(lng,lat)
  const markers = pins.slice(0, 50).map((pin, index) => {
    const color = pin.isItineraryStop ? 'ea580c' : '3b82f6'; // Orange for itinerary, blue for others
    const lng = pin.coordinates[0].toFixed(6);
    const lat = pin.coordinates[1].toFixed(6);
    return `pin-s+${color}(${lng},${lat})`;
  }).join(',');

  // Use auto-fit with padding
  const staticUrl = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${markers}/auto/800x400@2x?padding=50,50,50,50&access_token=${mapboxToken}`;

  return staticUrl;
}

// Fetch map image and convert to base64
async function fetchMapAsBase64(url: string): Promise<string | null> {
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error('[TripExport] Failed to fetch map:', response.status);
      return null;
    }

    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[TripExport] Error fetching map:', error);
    return null;
  }
}

// Main export function
export async function exportTripToPDF(
  chat: Chat,
  options: ExportOptions = {
    includeMap: true,
    includeBudget: true,
    includePackingList: true,
    includeItinerary: true,
    includeSummary: true,
  },
  mapboxToken?: string
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // Fixed column positions for budget table (absolute positions from left margin)
  const COL = {
    name: margin + 2,           // Item name starts here
    nameWidth: 75,              // Max width for name column
    qty: margin + 80,           // Quantity column
    unit: margin + 95,          // Unit column
    amount: margin + 130,       // Amount column (right side)
  };

  // Helper: Add new page if needed
  const checkNewPage = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) {
      pdf.addPage();
      y = margin;
      return true;
    }
    return false;
  };

  // Helper: Draw horizontal line
  const drawLine = (yPos: number, color: string = COLORS.stone700) => {
    pdf.setDrawColor(color);
    pdf.setLineWidth(0.3);
    pdf.line(margin, yPos, pageWidth - margin, yPos);
  };

  // Helper: Truncate text to fit within maxWidth
  const truncateText = (text: string, maxWidth: number): string => {
    if (pdf.getTextWidth(text) <= maxWidth) return text;
    let truncated = text;
    while (truncated.length > 0 && pdf.getTextWidth(truncated + '...') > maxWidth) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  };

  // ===== COVER PAGE =====
  // Background header
  pdf.setFillColor(COLORS.stone900);
  pdf.rect(0, 0, pageWidth, 80, 'F');

  // Orange accent bar
  pdf.setFillColor(COLORS.orange);
  pdf.rect(0, 75, pageWidth, 5, 'F');

  // Title
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.setTextColor(COLORS.white);

  const title = chat.destination !== 'General'
    ? chat.destination
    : chat.title || 'My Trip';

  pdf.text(title, pageWidth / 2, 35, { align: 'center' });

  // Subtitle
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(14);
  pdf.setTextColor(COLORS.stone400);
  pdf.text('Trip Planning Guide', pageWidth / 2, 48, { align: 'center' });

  // Trip details box
  const detailsY = 58;
  pdf.setFontSize(11);
  pdf.setTextColor(COLORS.stone300);

  const details = [];
  if (chat.tripContext.tripDurationDays) {
    details.push(`${chat.tripContext.tripDurationDays} days`);
  }
  if (chat.tripContext.travelerCount === 1) {
    details.push('Solo');
  } else if (chat.tripContext.travelerCount > 1) {
    details.push(`${chat.tripContext.travelerCount} travelers`);
  }
  if (chat.tripContext.dailyBudgetTarget) {
    details.push(`$${chat.tripContext.dailyBudgetTarget}/day`);
  }

  if (details.length > 0) {
    pdf.text(details.join('  |  '), pageWidth / 2, detailsY, { align: 'center' });
  }

  y = 95;

  // ===== TRIP SUMMARY =====
  if (options.includeSummary) {
    const summary = await generateTripSummary(chat);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(COLORS.orange);
    pdf.text('Trip Overview', margin, y);
    y += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(COLORS.stone600);

    const lines = pdf.splitTextToSize(summary, contentWidth);
    lines.forEach((line: string) => {
      checkNewPage(5);
      pdf.text(line, margin, y);
      y += 5;
    });

    y += 10;
  }

  // ===== MAP =====
  if (options.includeMap && chat.mapPins.length > 0 && mapboxToken) {
    checkNewPage(80);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(COLORS.orange);
    pdf.text('Your Route', margin, y);
    y += 8;

    // Fetch and embed map image
    const mapUrl = generateStaticMapUrl(chat.mapPins, mapboxToken);
    const mapBase64 = await fetchMapAsBase64(mapUrl);

    if (mapBase64) {
      const mapWidth = contentWidth;
      const mapHeight = mapWidth * 0.5; // 2:1 aspect ratio
      pdf.addImage(mapBase64, 'PNG', margin, y, mapWidth, mapHeight);
      y += mapHeight + 5;

      // Map legend
      pdf.setFontSize(8);
      pdf.setTextColor(COLORS.stone500);
      pdf.text('Orange pins: Itinerary stops  |  Blue pins: Points of interest', margin, y);
      y += 10;
    } else {
      pdf.setFontSize(10);
      pdf.setTextColor(COLORS.stone500);
      pdf.text('Map could not be loaded', margin, y);
      y += 10;
    }
  }

  // ===== ITINERARY =====
  if (options.includeItinerary && chat.tripContext.itineraryBreakdown.length > 0) {
    checkNewPage(40);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(COLORS.orange);
    pdf.text('Itinerary', margin, y);
    y += 10;

    chat.tripContext.itineraryBreakdown.forEach((stop, index) => {
      checkNewPage(20);

      // Stop number circle
      pdf.setFillColor(COLORS.orange);
      pdf.circle(margin + 4, y - 1, 4, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(COLORS.white);
      pdf.text(String(index + 1), margin + 4, y + 0.5, { align: 'center' });

      // Days badge text (measure first to know how much space to reserve)
      const daysText = `${stop.days} day${stop.days !== 1 ? 's' : ''}`;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const daysWidth = pdf.getTextWidth(daysText);

      // Stop name - truncate to leave room for days badge
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.setTextColor(COLORS.stone800);
      const maxLocationWidth = contentWidth - 20 - daysWidth - 10; // 20 for circle+padding, 10 for gap
      const truncatedLocation = truncateText(stop.location, maxLocationWidth);
      pdf.text(truncatedLocation, margin + 12, y);

      // Days badge - positioned at fixed location on the right
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(COLORS.stone500);
      pdf.text(daysText, pageWidth - margin - daysWidth, y);

      y += 6;

      // Notes - properly wrapped
      if (stop.notes) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(COLORS.stone600);
        const noteLines = pdf.splitTextToSize(stop.notes, contentWidth - 15);
        noteLines.forEach((line: string) => {
          checkNewPage(5);
          pdf.text(line, margin + 12, y);
          y += 4;
        });
      }

      y += 4;
    });

    y += 8;
  }

  // ===== BUDGET BREAKDOWN =====
  if (options.includeBudget && chat.tripCosts.items.length > 0) {
    checkNewPage(50);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(COLORS.orange);
    pdf.text('Budget Breakdown', margin, y);
    y += 10;

    // Calculate total
    const total = chat.tripCosts.items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);

    // Group costs by category
    const costsByCategory: Record<string, CostItem[]> = {};
    chat.tripCosts.items.forEach(item => {
      if (!costsByCategory[item.category]) {
        costsByCategory[item.category] = [];
      }
      costsByCategory[item.category].push(item);
    });

    // Table header row
    pdf.setFillColor(COLORS.stone200);
    pdf.rect(margin, y - 4, contentWidth, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(COLORS.stone700);
    pdf.text('Item', COL.name, y);
    pdf.text('Qty', COL.qty, y);
    pdf.text('Unit', COL.unit, y);
    pdf.text('Amount', COL.amount, y);
    y += 8;

    Object.entries(costsByCategory).forEach(([category, items]) => {
      checkNewPage(20);

      // Category header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      pdf.setTextColor(COLORS.orange);
      const categoryLabel = CATEGORY_LABELS[category as CostCategory] || category;
      pdf.text(categoryLabel, COL.name, y);
      y += 6;

      // Category subtotal
      const categoryTotal = items.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(COLORS.stone500);
      pdf.text(`$${categoryTotal.toFixed(0)}`, COL.amount, y - 6);

      // Items in category
      items.forEach(item => {
        checkNewPage(6);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(COLORS.stone700);

        // Truncate name to fit column width
        const truncatedName = truncateText(item.name, COL.nameWidth);
        pdf.text(truncatedName, COL.name + 2, y);

        // Center qty in its column
        pdf.text(String(item.quantity), COL.qty, y);

        // Unit - truncate if needed
        const unitText = item.unit || '-';
        pdf.text(truncateText(unitText, 30), COL.unit, y);

        // Amount - right side
        const itemTotal = item.amount * item.quantity;
        pdf.text(`$${itemTotal.toFixed(0)}`, COL.amount, y);

        y += 5;
      });

      y += 4;
    });

    // Total row
    checkNewPage(15);
    drawLine(y, COLORS.stone400);
    y += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(COLORS.stone800);
    pdf.text('TOTAL', COL.name, y);
    pdf.text(`$${total.toFixed(0)} ${chat.tripCosts.currency}`, COL.amount, y);

    // Daily average
    if (chat.tripContext.tripDurationDays > 0) {
      y += 6;
      const dailyAvg = total / chat.tripContext.tripDurationDays;
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(COLORS.stone600);
      pdf.text(`Daily Average: $${dailyAvg.toFixed(0)}/day`, COL.name, y);
    }

    y += 15;
  }

  // ===== PACKING LIST =====
  if (options.includePackingList && chat.packingList.items.length > 0) {
    pdf.addPage();
    y = margin;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(COLORS.orange);
    pdf.text('Packing Checklist', margin, y);
    y += 10;

    // Group by category
    const itemsByCategory: Record<string, PackingItem[]> = {};
    chat.packingList.items.forEach(item => {
      if (!itemsByCategory[item.category]) {
        itemsByCategory[item.category] = [];
      }
      itemsByCategory[item.category].push(item);
    });

    // Two-column layout
    const colWidth = (contentWidth - 10) / 2;
    let col = 0;
    let colY = y;
    const startY = y;

    Object.entries(itemsByCategory).forEach(([category, items]) => {
      const categoryHeight = 8 + (items.length * 5) + 5;

      // Check if we need to switch columns or add new page
      if (colY + categoryHeight > pageHeight - margin) {
        if (col === 0) {
          col = 1;
          colY = startY;
        } else {
          pdf.addPage();
          col = 0;
          colY = margin;
        }
      }

      const xOffset = col === 0 ? margin : margin + colWidth + 10;

      // Category header
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.setTextColor(COLORS.stone800);
      pdf.text(PACKING_CATEGORY_LABELS[category] || category, xOffset, colY);
      colY += 6;

      // Items with checkboxes
      items.forEach(item => {
        // Checkbox
        pdf.setDrawColor(COLORS.stone500);
        pdf.setLineWidth(0.3);
        pdf.rect(xOffset, colY - 3, 3.5, 3.5);

        // If packed, add checkmark
        if (item.packed) {
          pdf.setDrawColor(COLORS.green);
          pdf.setLineWidth(0.5);
          pdf.line(xOffset + 0.5, colY - 1, xOffset + 1.5, colY);
          pdf.line(xOffset + 1.5, colY, xOffset + 3, colY - 2.5);
        }

        // Item name - truncate to fit column
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(COLORS.stone700);

        let itemText = item.name;
        if (item.quantity > 1) {
          itemText += ` (x${item.quantity})`;
        }

        // Truncate to fit column width (account for checkbox space)
        const maxItemWidth = colWidth - 8;
        const truncatedItem = truncateText(itemText, maxItemWidth);
        pdf.text(truncatedItem, xOffset + 5, colY);
        colY += 5;
      });

      colY += 3;
    });

    y = Math.max(y, colY) + 10;
  }

  // ===== FOOTER ON LAST PAGE =====
  const lastPageY = pdf.internal.pageSize.getHeight() - 20;

  // Footer line
  drawLine(lastPageY - 5, COLORS.orange);

  // Branding
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(COLORS.orange);
  pdf.text('superglobal.travel', margin, lastPageY);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(COLORS.stone500);
  pdf.text('Powered by The Broke Backpacker', margin, lastPageY + 4);

  // Generation date
  pdf.text(
    `Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    pageWidth - margin,
    lastPageY,
    { align: 'right' }
  );

  // Save the PDF
  const filename = `${chat.destination !== 'General' ? chat.destination : 'trip'}-travel-guide.pdf`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

  pdf.save(filename);
}

// Export button component helper
export function getExportStatus(chat: Chat): {
  canExport: boolean;
  message: string;
  hasMap: boolean;
  hasBudget: boolean;
  hasPackingList: boolean;
  hasItinerary: boolean;
} {
  const hasMap = chat.mapPins.length > 0;
  const hasBudget = chat.tripCosts.items.length > 0;
  const hasPackingList = chat.packingList.items.length > 0;
  const hasItinerary = chat.tripContext.itineraryBreakdown.length > 0;

  const canExport = hasMap || hasBudget || hasPackingList || hasItinerary || chat.messages.length > 2;

  let message = '';
  if (!canExport) {
    message = 'Start planning to enable export';
  } else {
    const sections = [];
    if (hasItinerary) sections.push('itinerary');
    if (hasMap) sections.push('map');
    if (hasBudget) sections.push('budget');
    if (hasPackingList) sections.push('packing list');
    message = `Export includes: ${sections.join(', ') || 'trip summary'}`;
  }

  return { canExport, message, hasMap, hasBudget, hasPackingList, hasItinerary };
}
