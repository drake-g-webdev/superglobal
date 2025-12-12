import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';
import { z } from 'zod';

// Validation schema for creating a trip
const createTripSchema = z.object({
  destination: z.string().min(1).max(500),
  duration: z.number().int().min(1).max(365).default(14),
  startDate: z.string().datetime().optional().nullable(),
  dailyBudget: z.number().positive().max(100000).optional().nullable(),
  preferredLanguage: z.string().max(10).default('en'),
  transportStyles: z.array(z.string().max(100)).max(20).default([]),
  accommodationStyles: z.array(z.string().max(100)).max(20).default([]),
  dealBreakers: z.array(z.string().max(200)).max(50).default([]),
  goals: z.array(z.string().max(200)).max(50).default([]),
  customGoals: z.array(z.string().max(500)).max(20).default([]),
  overrideNightWalking: z.boolean().optional().nullable(),
  overrideMotorbikes: z.boolean().optional().nullable(),
  overrideCouchsurfing: z.boolean().optional().nullable(),
  overrideInstagram: z.boolean().optional().nullable(),
  overrideHiddenGems: z.boolean().optional().nullable(),
  needsVisa: z.boolean().default(false),
  visaOnArrival: z.boolean().default(false),
  visaNotes: z.string().max(2000).optional().nullable(),
  mapCenter: z.tuple([z.number(), z.number()]).optional().nullable(),
  mapZoom: z.number().min(0).max(22).optional().nullable(),
  itineraryStops: z.array(z.object({
    location: z.string().min(1).max(500),
    days: z.number().int().min(1).max(365),
    notes: z.string().max(5000).optional().nullable(),
  })).max(100).optional(),
});

// GET all trips for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const trips = await prisma.trip.findMany({
      where: { userId: session.user.id },
      include: {
        itineraryStops: { orderBy: { order: 'asc' } },
        costItems: true,
        mapPins: true,
        chats: {
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(trips);
  } catch (error) {
    console.error('Error fetching trips:', error);
    // Return empty array instead of 500 so client can fall back to localStorage
    return NextResponse.json([], { status: 200 });
  }
}

// POST create a new trip
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    let data;
    try {
      const body = await request.json();
      const result = createTripSchema.safeParse(body);
      if (!result.success) {
        const errorMessage = result.error.issues
          .map((e) => `${String(e.path.join('.'))}: ${e.message}`)
          .join(', ');
        return NextResponse.json(
          { error: 'Validation failed', details: errorMessage },
          { status: 400 }
        );
      }
      data = result.data;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const trip = await prisma.trip.create({
      data: {
        userId: session.user.id,
        destination: data.destination,
        duration: data.duration || 14,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dailyBudget: data.dailyBudget,
        preferredLanguage: data.preferredLanguage || 'en',
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
        needsVisa: data.needsVisa || false,
        visaOnArrival: data.visaOnArrival || false,
        visaNotes: data.visaNotes,
        mapCenter: data.mapCenter ?? undefined,
        mapZoom: data.mapZoom ?? undefined,
        itineraryStops: data.itineraryStops
          ? {
              create: data.itineraryStops.map((stop, index) => ({
                location: stop.location,
                days: stop.days,
                notes: stop.notes ?? undefined,
                order: index,
              })),
            }
          : undefined,
      },
      include: {
        itineraryStops: { orderBy: { order: 'asc' } },
        costItems: true,
        mapPins: true,
        chats: {
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    return NextResponse.json(trip);
  } catch (error) {
    console.error('Error creating trip:', error);
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 });
  }
}
