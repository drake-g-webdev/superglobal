import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

type RouteContext = { params: Promise<{ tripId: string }> };

// GET a single trip
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId } = await context.params;

    const trip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        userId: session.user.id,
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

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (error) {
    console.error('Error fetching trip:', error);
    return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 });
  }
}

// PUT update a trip
export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId } = await context.params;
    const data = await request.json();

    // Verify ownership
    const existingTrip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        userId: session.user.id,
      },
    });

    if (!existingTrip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        destination: data.destination,
        duration: data.duration,
        startDate: data.startDate ? new Date(data.startDate) : null,
        dailyBudget: data.dailyBudget,
        preferredLanguage: data.preferredLanguage,
        transportStyles: data.transportStyles,
        accommodationStyles: data.accommodationStyles,
        dealBreakers: data.dealBreakers,
        goals: data.goals,
        customGoals: data.customGoals,
        overrideNightWalking: data.overrideNightWalking,
        overrideMotorbikes: data.overrideMotorbikes,
        overrideCouchsurfing: data.overrideCouchsurfing,
        overrideInstagram: data.overrideInstagram,
        overrideHiddenGems: data.overrideHiddenGems,
        needsVisa: data.needsVisa,
        visaOnArrival: data.visaOnArrival,
        visaNotes: data.visaNotes,
        mapCenter: data.mapCenter,
        mapZoom: data.mapZoom,
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
    console.error('Error updating trip:', error);
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 });
  }
}

// DELETE a trip
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId } = await context.params;

    // Verify ownership
    const existingTrip = await prisma.trip.findFirst({
      where: {
        id: tripId,
        userId: session.user.id,
      },
    });

    if (!existingTrip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    await prisma.trip.delete({
      where: { id: tripId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trip:', error);
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 });
  }
}
