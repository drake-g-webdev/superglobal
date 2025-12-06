import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

type RouteContext = { params: Promise<{ tripId: string }> };

// POST - Full sync of trip data from client
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId } = await context.params;
    const data = await request.json();

    // Verify ownership
    const existingTrip = await prisma.trip.findFirst({
      where: { id: tripId, userId: session.user.id },
    });

    if (!existingTrip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Update trip basic data
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        destination: data.destination,
        duration: data.duration,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dailyBudget: data.dailyBudget,
        preferredLanguage: data.preferredLanguage,
        tripSetupComplete: data.tripSetupComplete ?? false,
        transportStyles: data.transportStyles || [],
        accommodationStyles: data.accommodationStyles || [],
        dealBreakers: data.dealBreakers || [],
        goals: data.goals || [],
        customGoals: data.customGoals || [],
        overrideNightWalking: data.overrideNightWalking,
        overrideMotorbikes: data.overrideMotorbikes,
        overrideCouchsurfing: data.overrideCouchsurfing,
        overrideInstagram: data.overrideInstagram,
        overrideHiddenGems: data.overrideHiddenGems,
        needsVisa: data.needsVisa ?? false,
        visaOnArrival: data.visaOnArrival ?? false,
        visaNotes: data.visaNotes,
        mapCenter: data.mapCenter,
        mapZoom: data.mapZoom,
        eventsLastFetched: data.eventsLastFetched ? new Date(data.eventsLastFetched) : null,
        eventsTravelAdvisory: data.eventsTravelAdvisory,
      },
    });

    // Sync itinerary stops (delete all, recreate)
    if (data.itineraryStops) {
      await prisma.itineraryStop.deleteMany({ where: { tripId } });
      if (data.itineraryStops.length > 0) {
        await prisma.itineraryStop.createMany({
          data: data.itineraryStops.map((stop: { location: string; days: number; notes?: string }, idx: number) => ({
            tripId,
            location: stop.location,
            days: stop.days,
            notes: stop.notes || null,
            order: idx,
          })),
        });
      }
    }

    // Sync cost items
    if (data.costItems) {
      await prisma.costItem.deleteMany({ where: { tripId } });
      if (data.costItems.length > 0) {
        await prisma.costItem.createMany({
          data: data.costItems.map((item: { name: string; category: string; amount: number; quantity?: number; unit?: string; notes?: string }) => ({
            tripId,
            name: item.name,
            category: item.category,
            amount: item.amount,
            quantity: item.quantity ?? 1,
            unit: item.unit || null,
            notes: item.notes || null,
          })),
        });
      }
    }

    // Sync map pins (with all itinerary fields)
    // We need to handle parentStopId references carefully - parent pins get new DB IDs
    if (data.mapPins) {
      await prisma.mapPin.deleteMany({ where: { tripId } });

      if (data.mapPins.length > 0) {
        type PinInput = {
          id?: string;
          name: string;
          type: string;
          description?: string;
          coordinates: number[];
          sourceMessageIndex?: number;
          isItineraryStop?: boolean;
          itineraryOrder?: number;
          days?: number;
          notes?: string;
          parentStopId?: string;
          placeDetails?: object;
        };

        // Separate parent pins (itinerary stops) and child pins
        const parentPins = (data.mapPins as PinInput[]).filter((p: PinInput) => p.isItineraryStop || !p.parentStopId);
        const childPins = (data.mapPins as PinInput[]).filter((p: PinInput) => !p.isItineraryStop && p.parentStopId);

        // Build a map of old client IDs to track them
        const oldIdToPin = new Map<string, PinInput>();
        (data.mapPins as PinInput[]).forEach((pin: PinInput) => {
          if (pin.id) oldIdToPin.set(pin.id, pin);
        });

        // Create parent pins first and build ID mapping
        const oldToNewIdMap = new Map<string, string>();

        for (const pin of parentPins) {
          const created = await prisma.mapPin.create({
            data: {
              tripId,
              name: pin.name,
              type: pin.type,
              description: pin.description || null,
              coordinates: pin.coordinates,
              sourceMessageIndex: pin.sourceMessageIndex ?? null,
              isItineraryStop: pin.isItineraryStop ?? false,
              itineraryOrder: pin.itineraryOrder ?? null,
              days: pin.days ?? null,
              notes: pin.notes || null,
              parentStopId: null, // Parent pins don't have parents
              placeDetails: pin.placeDetails || null,
            },
          });

          // Map old ID to new database ID
          if (pin.id) {
            oldToNewIdMap.set(pin.id, created.id);
          }
        }

        // Now create child pins with updated parentStopId references
        for (const pin of childPins) {
          // Look up the new ID for the parent
          const newParentId = pin.parentStopId ? oldToNewIdMap.get(pin.parentStopId) : null;

          await prisma.mapPin.create({
            data: {
              tripId,
              name: pin.name,
              type: pin.type,
              description: pin.description || null,
              coordinates: pin.coordinates,
              sourceMessageIndex: pin.sourceMessageIndex ?? null,
              isItineraryStop: false,
              itineraryOrder: null,
              days: pin.days ?? null,
              notes: pin.notes || null,
              parentStopId: newParentId || null, // Use the NEW parent ID
              placeDetails: pin.placeDetails || null,
            },
          });
        }
      }
    }

    // Sync route segments (need to update pin IDs if they changed)
    // Note: oldToNewIdMap is built in the mapPins sync above
    if (data.routeSegments) {
      await prisma.routeSegment.deleteMany({ where: { tripId } });
      if (data.routeSegments.length > 0) {
        // Build ID map from mapPins if not already done
        const pinIdMap = new Map<string, string>();
        if (data.mapPins) {
          // Get all pins from database (they were just created above)
          const dbPins = await prisma.mapPin.findMany({ where: { tripId } });
          // Match by name+coordinates since we just recreated them
          for (const clientPin of data.mapPins as { id?: string; name: string; coordinates: number[] }[]) {
            if (clientPin.id) {
              const dbPin = dbPins.find(p =>
                p.name === clientPin.name &&
                JSON.stringify(p.coordinates) === JSON.stringify(clientPin.coordinates)
              );
              if (dbPin) {
                pinIdMap.set(clientPin.id, dbPin.id);
              }
            }
          }
        }

        await prisma.routeSegment.createMany({
          data: data.routeSegments.map((segment: {
            fromPinId: string;
            toPinId: string;
            distance: object;
            duration: object;
            polyline: string;
            mode: string;
          }) => ({
            tripId,
            fromPinId: pinIdMap.get(segment.fromPinId) || segment.fromPinId,
            toPinId: pinIdMap.get(segment.toPinId) || segment.toPinId,
            distance: segment.distance,
            duration: segment.duration,
            polyline: segment.polyline,
            mode: segment.mode,
          })),
        });
      }
    }

    // Sync bucket list items
    if (data.bucketListItems) {
      await prisma.bucketListItem.deleteMany({ where: { tripId } });
      if (data.bucketListItems.length > 0) {
        await prisma.bucketListItem.createMany({
          data: data.bucketListItems.map((item: { text: string; completed?: boolean; category?: string }) => ({
            tripId,
            text: item.text,
            completed: item.completed ?? false,
            category: item.category || null,
          })),
        });
      }
    }

    // Sync packing items
    if (data.packingItems) {
      await prisma.packingItem.deleteMany({ where: { tripId } });
      if (data.packingItems.length > 0) {
        await prisma.packingItem.createMany({
          data: data.packingItems.map((item: { name: string; category: string; packed?: boolean; quantity?: number; notes?: string }) => ({
            tripId,
            name: item.name,
            category: item.category,
            packed: item.packed ?? false,
            quantity: item.quantity ?? 1,
            notes: item.notes || null,
          })),
        });
      }
    }

    // Sync tourist traps
    if (data.touristTraps) {
      await prisma.touristTrap.deleteMany({ where: { tripId } });
      if (data.touristTraps.length > 0) {
        await prisma.touristTrap.createMany({
          data: data.touristTraps.map((trap: { name: string; description: string; location?: string; sourceMessageIndex?: number }) => ({
            tripId,
            name: trap.name,
            description: trap.description,
            location: trap.location || null,
            sourceMessageIndex: trap.sourceMessageIndex ?? null,
          })),
        });
      }
    }

    // Sync events
    if (data.tripEvents) {
      await prisma.tripEvent.deleteMany({ where: { tripId } });
      if (data.tripEvents.length > 0) {
        await prisma.tripEvent.createMany({
          data: data.tripEvents.map((event: { name: string; eventType: string; dateRange: string; location: string; description: string; isFree?: boolean; estimatedPriceUsd?: number; budgetTip?: string; backpackerRating?: number; isInterested?: boolean }) => ({
            tripId,
            name: event.name,
            eventType: event.eventType,
            dateRange: event.dateRange,
            location: event.location,
            description: event.description,
            isFree: event.isFree ?? false,
            estimatedPriceUsd: event.estimatedPriceUsd ?? null,
            budgetTip: event.budgetTip || null,
            backpackerRating: event.backpackerRating ?? 3,
            isInterested: event.isInterested ?? false,
          })),
        });
      }
    }

    // Sync conversation variables
    if (data.conversationVars) {
      await prisma.conversationVariable.deleteMany({ where: { tripId } });
      const varEntries = Object.entries(data.conversationVars);
      if (varEntries.length > 0) {
        await prisma.conversationVariable.createMany({
          data: varEntries.map(([key, value]) => ({
            tripId,
            key,
            value: value as object,
          })),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error syncing trip:', error);
    // Return success: false but 200 status so client knows to keep localStorage data
    return NextResponse.json({ success: false, error: 'Failed to sync trip' }, { status: 200 });
  }
}

// GET - Full fetch of trip data for client
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId } = await context.params;

    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId: session.user.id },
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
        chats: {
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
            extractedLocations: { orderBy: { createdAt: 'asc' } },
            extractedCosts: { orderBy: { createdAt: 'asc' } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Convert conversation vars array to object
    const conversationVars: Record<string, unknown> = {};
    for (const v of trip.conversationVars) {
      conversationVars[v.key] = v.value;
    }

    return NextResponse.json({
      ...trip,
      conversationVars,
    });
  } catch (error) {
    console.error('Error fetching trip:', error);
    // Return null instead of 500 so client can fall back to localStorage
    return NextResponse.json(null, { status: 200 });
  }
}
