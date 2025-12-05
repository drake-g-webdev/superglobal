import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

type RouteContext = { params: Promise<{ tripId: string }> };

// GET itinerary stops for a trip
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId } = await context.params;

    // Verify ownership
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId: session.user.id },
      include: {
        itineraryStops: { orderBy: { order: 'asc' } },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    return NextResponse.json(trip.itineraryStops);
  } catch (error) {
    console.error('Error fetching itinerary:', error);
    // Return empty array instead of 500 so client can fall back to localStorage
    return NextResponse.json([], { status: 200 });
  }
}

// POST - Add/replace itinerary stops from AI extraction
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

    const { stops, mode = 'replace' } = data;

    if (!Array.isArray(stops)) {
      return NextResponse.json({ error: 'Invalid stops data' }, { status: 400 });
    }

    if (mode === 'replace') {
      // Delete existing stops and add new ones
      await prisma.itineraryStop.deleteMany({ where: { tripId } });
    }

    // Get current max order if appending
    let startOrder = 0;
    if (mode === 'append') {
      const maxOrderStop = await prisma.itineraryStop.findFirst({
        where: { tripId },
        orderBy: { order: 'desc' },
      });
      startOrder = maxOrderStop ? maxOrderStop.order + 1 : 0;
    }

    // Create new stops
    if (stops.length > 0) {
      await prisma.itineraryStop.createMany({
        data: stops.map((stop: { location: string; days: number; notes?: string }, idx: number) => ({
          tripId,
          location: stop.location,
          days: stop.days,
          notes: stop.notes || null,
          order: startOrder + idx,
        })),
      });
    }

    // Calculate total duration and update trip
    const totalDays = stops.reduce((sum: number, stop: { days: number }) => sum + stop.days, 0);

    // Only update duration if replacing (not appending)
    if (mode === 'replace' && totalDays > 0) {
      await prisma.trip.update({
        where: { id: tripId },
        data: { duration: totalDays },
      });
    }

    // Fetch updated stops
    const updatedStops = await prisma.itineraryStop.findMany({
      where: { tripId },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({
      success: true,
      stops: updatedStops,
      totalDays: updatedStops.reduce((sum, stop) => sum + stop.days, 0),
    });
  } catch (error) {
    console.error('Error updating itinerary:', error);
    return NextResponse.json({ error: 'Failed to update itinerary' }, { status: 500 });
  }
}

// PUT - Update a single stop
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId } = await context.params;
    const data = await request.json();
    const { stopId, location, days, notes } = data;

    if (!stopId) {
      return NextResponse.json({ error: 'Stop ID required' }, { status: 400 });
    }

    // Verify ownership through trip
    const stop = await prisma.itineraryStop.findFirst({
      where: { id: stopId },
      include: { trip: true },
    });

    if (!stop || stop.trip.userId !== session.user.id) {
      return NextResponse.json({ error: 'Stop not found' }, { status: 404 });
    }

    const updatedStop = await prisma.itineraryStop.update({
      where: { id: stopId },
      data: {
        location: location ?? stop.location,
        days: days ?? stop.days,
        notes: notes !== undefined ? notes : stop.notes,
      },
    });

    return NextResponse.json(updatedStop);
  } catch (error) {
    console.error('Error updating stop:', error);
    return NextResponse.json({ error: 'Failed to update stop' }, { status: 500 });
  }
}

// DELETE - Remove a stop or all stops
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tripId } = await context.params;
    const { searchParams } = new URL(request.url);
    const stopId = searchParams.get('stopId');

    // Verify ownership
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId: session.user.id },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (stopId) {
      // Delete single stop
      await prisma.itineraryStop.delete({
        where: { id: stopId },
      });
    } else {
      // Delete all stops for trip
      await prisma.itineraryStop.deleteMany({
        where: { tripId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting stop:', error);
    return NextResponse.json({ error: 'Failed to delete stop' }, { status: 500 });
  }
}
