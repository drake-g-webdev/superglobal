import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

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
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
  }
}

// POST create a new trip
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

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
        mapCenter: data.mapCenter,
        mapZoom: data.mapZoom,
        itineraryStops: data.itineraryStops
          ? {
              create: data.itineraryStops.map((stop: { location: string; days: number; notes?: string }, index: number) => ({
                location: stop.location,
                days: stop.days,
                notes: stop.notes,
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
