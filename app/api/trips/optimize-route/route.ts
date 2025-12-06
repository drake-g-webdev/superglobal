import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

interface Stop {
  id: string;
  name: string;
  coordinates: [number, number]; // [lng, lat]
}

// Calculate distance between two points using Haversine formula
function haversineDistance(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371; // Earth's radius in km
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate total route distance
function calculateTotalDistance(stops: Stop[]): number {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    total += haversineDistance(stops[i].coordinates, stops[i + 1].coordinates);
  }
  return total;
}

// Nearest neighbor algorithm for TSP approximation
function nearestNeighborOptimize(stops: Stop[]): Stop[] {
  if (stops.length <= 2) return stops;

  const result: Stop[] = [];
  const remaining = [...stops];

  // Start from the first stop (user's starting point)
  result.push(remaining.shift()!);

  while (remaining.length > 0) {
    const current = result[result.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const dist = haversineDistance(current.coordinates, remaining[i].coordinates);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    result.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return result;
}

// 2-opt improvement for better optimization
function twoOptImprove(stops: Stop[]): Stop[] {
  if (stops.length <= 3) return stops;

  let improved = true;
  let route = [...stops];

  while (improved) {
    improved = false;
    for (let i = 1; i < route.length - 2; i++) {
      for (let j = i + 1; j < route.length - 1; j++) {
        // Calculate current distance
        const d1 = haversineDistance(route[i - 1].coordinates, route[i].coordinates);
        const d2 = haversineDistance(route[j].coordinates, route[j + 1].coordinates);

        // Calculate new distance if we reverse the segment
        const d3 = haversineDistance(route[i - 1].coordinates, route[j].coordinates);
        const d4 = haversineDistance(route[i].coordinates, route[j + 1].coordinates);

        if (d3 + d4 < d1 + d2) {
          // Reverse the segment between i and j
          const newRoute = [
            ...route.slice(0, i),
            ...route.slice(i, j + 1).reverse(),
            ...route.slice(j + 1)
          ];
          route = newRoute;
          improved = true;
        }
      }
    }
  }

  return route;
}

// POST - Optimize route order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { stops } = await request.json() as { stops: Stop[] };

    if (!stops || stops.length < 2) {
      return NextResponse.json({
        error: 'At least 2 stops required for optimization'
      }, { status: 400 });
    }

    // Calculate original distance
    const originalDistance = calculateTotalDistance(stops);

    // Apply nearest neighbor algorithm
    let optimized = nearestNeighborOptimize(stops);

    // Improve with 2-opt
    optimized = twoOptImprove(optimized);

    // Calculate optimized distance
    const optimizedDistance = calculateTotalDistance(optimized);

    // Return the optimized order (just IDs in new order)
    return NextResponse.json({
      success: true,
      originalOrder: stops.map(s => s.id),
      optimizedOrder: optimized.map(s => s.id),
      originalDistanceKm: Math.round(originalDistance),
      optimizedDistanceKm: Math.round(optimizedDistance),
      savedKm: Math.round(originalDistance - optimizedDistance),
      savedPercent: Math.round((1 - optimizedDistance / originalDistance) * 100),
    });
  } catch (error) {
    console.error('Error optimizing route:', error);
    return NextResponse.json({ error: 'Failed to optimize route' }, { status: 500 });
  }
}
