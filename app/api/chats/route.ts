import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

// GET - Fetch all chats for the current user (across all trips)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chats = await prisma.chat.findMany({
      where: {
        trip: { userId: session.user.id },
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        extractedLocations: { orderBy: { createdAt: 'asc' } },
        extractedCosts: { orderBy: { createdAt: 'asc' } },
        trip: {
          include: {
            itineraryStops: { orderBy: { order: 'asc' } },
            costItems: { orderBy: { createdAt: 'asc' } },
            mapPins: { orderBy: { createdAt: 'asc' } },
            routeSegments: { orderBy: { createdAt: 'asc' } },
            bucketListItems: { orderBy: { createdAt: 'asc' } },
            packingItems: { orderBy: { createdAt: 'asc' } },
            touristTraps: { orderBy: { createdAt: 'asc' } },
            tripEvents: { orderBy: { createdAt: 'asc' } },
            conversationVars: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Transform to match frontend format
    const transformedChats = chats.map((chat) => {
      // Transform extracted locations
      const extractedLocations: Record<number, Array<{ name: string; type: string; description?: string; area?: string }>> = {};
      for (const loc of chat.extractedLocations) {
        if (!extractedLocations[loc.messageIndex]) {
          extractedLocations[loc.messageIndex] = [];
        }
        extractedLocations[loc.messageIndex].push({
          name: loc.name,
          type: loc.type,
          description: loc.description || undefined,
          area: loc.area || undefined,
        });
      }

      // Transform extracted costs
      const extractedCosts: Record<number, Array<{ name: string; category: string; amount: number; quantity: number; unit: string; notes?: string; text_to_match?: string }>> = {};
      for (const cost of chat.extractedCosts) {
        if (!extractedCosts[cost.messageIndex]) {
          extractedCosts[cost.messageIndex] = [];
        }
        extractedCosts[cost.messageIndex].push({
          name: cost.name,
          category: cost.category,
          amount: cost.amount,
          quantity: cost.quantity,
          unit: cost.unit,
          notes: cost.notes || undefined,
          text_to_match: cost.textToMatch || undefined,
        });
      }

      // Transform conversation vars
      const conversationVars: Record<string, unknown> = {};
      for (const v of chat.trip.conversationVars) {
        conversationVars[v.key] = v.value;
      }

      return {
        id: chat.id,
        title: chat.title,
        destination: chat.destination || chat.trip.destination,
        budget: chat.budget || 'Backpacker',
        messages: chat.messages.map((m) => ({ role: m.role, content: m.content })),
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString(),
        tripSetupComplete: chat.tripSetupComplete,
        tripContext: {
          itineraryBreakdown: chat.trip.itineraryStops.map((s) => ({
            location: s.location,
            days: s.days,
            notes: s.notes || '',
          })),
          transportationStyles: chat.trip.transportStyles,
          accommodationStyles: chat.trip.accommodationStyles,
          dailyBudgetTarget: chat.trip.dailyBudget || 50,
          tripDurationDays: chat.trip.duration,
          startDate: chat.trip.startDate?.toISOString() || null,
          dealBreakers: chat.trip.dealBreakers,
          preferredLanguage: chat.trip.preferredLanguage,
          tripGoals: chat.trip.goals,
          customGoals: chat.trip.customGoals,
          walkAtNightOverride: chat.trip.overrideNightWalking,
          experiencedMotosOverride: chat.trip.overrideMotorbikes,
          openToCouchsurfingOverride: chat.trip.overrideCouchsurfing,
          instagramFriendlyOverride: chat.trip.overrideInstagram,
          hiddenSpotsOverride: chat.trip.overrideHiddenGems,
          needsVisa: chat.trip.needsVisa,
          visaOnArrival: chat.trip.visaOnArrival,
          visaNotes: chat.trip.visaNotes || '',
        },
        mapPins: chat.trip.mapPins.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          description: p.description || '',
          coordinates: p.coordinates as [number, number],
          sourceMessageIndex: p.sourceMessageIndex,
          isItineraryStop: p.isItineraryStop,
          itineraryOrder: p.itineraryOrder,
          days: p.days,
          notes: p.notes || '',
          parentStopId: p.parentStopId,
          placeDetails: p.placeDetails,
          createdAt: p.createdAt.getTime(),
        })),
        mapCenter: chat.trip.mapCenter as [number, number] | null,
        mapZoom: chat.trip.mapZoom,
        routeSegments: chat.trip.routeSegments.map((r) => ({
          fromPinId: r.fromPinId,
          toPinId: r.toPinId,
          distance: r.distance,
          duration: r.duration,
          polyline: r.polyline,
          mode: r.mode,
        })),
        extractedLocations,
        extractedCosts,
        tripCosts: {
          items: chat.trip.costItems.map((c) => ({
            id: c.id,
            name: c.name,
            category: c.category,
            amount: c.amount,
            quantity: c.quantity,
            unit: c.unit || 'trip',
            notes: c.notes || '',
          })),
          currency: 'USD',
          lastUpdated: chat.trip.updatedAt.toISOString(),
        },
        touristTraps: chat.trip.touristTraps.map((t) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          location: t.location || '',
          sourceMessageIndex: t.sourceMessageIndex,
        })),
        bucketList: chat.trip.bucketListItems.map((b) => ({
          id: b.id,
          text: b.text,
          completed: b.completed,
          category: b.category || undefined,
          createdAt: b.createdAt.toISOString(),
        })),
        packingList: {
          items: chat.trip.packingItems.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            packed: p.packed,
            quantity: p.quantity,
            notes: p.notes || '',
          })),
          generatedAt: null,
          lastUpdated: chat.trip.updatedAt.toISOString(),
        },
        eventsData: {
          events: chat.trip.tripEvents.map((e) => ({
            id: e.id,
            name: e.name,
            eventType: e.eventType,
            dateRange: e.dateRange,
            location: e.location,
            description: e.description,
            isFree: e.isFree,
            estimatedPriceUsd: e.estimatedPriceUsd,
            budgetTip: e.budgetTip || '',
            backpackerRating: e.backpackerRating,
            isInterested: e.isInterested,
          })),
          travelAdvisory: chat.trip.eventsTravelAdvisory || '',
          lastFetched: chat.trip.eventsLastFetched?.toISOString() || null,
        },
        conversationVariables: conversationVars,
        tripId: chat.tripId,
      };
    });

    return NextResponse.json(transformedChats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    // Return empty array instead of 500 so client can fall back to localStorage
    return NextResponse.json([], { status: 200 });
  }
}

// POST - Create a new chat (and optionally a new trip)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    // Create trip first (or use existing tripId)
    let tripId = data.tripId;

    if (!tripId) {
      const trip = await prisma.trip.create({
        data: {
          userId: session.user.id,
          destination: data.destination || 'New Trip',
          duration: data.duration || 14,
          dailyBudget: data.dailyBudget || 50,
          preferredLanguage: data.preferredLanguage || 'en',
          tripSetupComplete: false,
        },
      });
      tripId = trip.id;
    }

    // Create chat
    const chat = await prisma.chat.create({
      data: {
        tripId,
        title: data.title || `Trip to ${data.destination || 'New Destination'}`,
        destination: data.destination,
        budget: data.budget || 'Backpacker',
        tripSetupComplete: false,
      },
      include: {
        trip: true,
      },
    });

    return NextResponse.json({
      id: chat.id,
      tripId: chat.tripId,
      title: chat.title,
      destination: chat.destination,
      budget: chat.budget,
      createdAt: chat.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json({ error: 'Failed to create chat' }, { status: 500 });
  }
}
