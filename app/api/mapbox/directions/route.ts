import { NextRequest, NextResponse } from 'next/server';

const MAPBOX_TOKEN = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export interface DirectionsLeg {
  distance: number; // meters
  duration: number; // seconds
}

export interface DirectionsRoute {
  legs: DirectionsLeg[];
  geometry: string; // Encoded polyline
  totalDistance: { text: string; value: number };
  totalDuration: { text: string; value: number };
  mode: string;
}

export async function POST(request: NextRequest) {
  if (!MAPBOX_TOKEN) {
    return NextResponse.json({ error: 'Mapbox token not configured' }, { status: 500 });
  }

  try {
    const { origin, destination, waypoints, mode = 'driving' } = await request.json();

    // origin/destination: [lng, lat] coordinates
    // waypoints: array of [lng, lat]
    // mode: driving, walking, cycling (mapbox uses 'cycling' not 'bicycling')

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origin and destination required' }, { status: 400 });
    }

    // Map mode to Mapbox profile
    const profileMap: Record<string, string> = {
      driving: 'mapbox/driving',
      walking: 'mapbox/walking',
      cycling: 'mapbox/cycling',
      bicycling: 'mapbox/cycling',
      transit: 'mapbox/driving', // Mapbox doesn't have transit, fallback to driving
    };

    const profile = profileMap[mode] || 'mapbox/driving';

    // Build coordinates string: origin;waypoints;destination
    const coordinates: string[] = [];

    // Origin: [lng, lat]
    if (Array.isArray(origin)) {
      coordinates.push(`${origin[0]},${origin[1]}`);
    }

    // Waypoints
    if (waypoints && waypoints.length > 0) {
      for (const wp of waypoints) {
        if (Array.isArray(wp)) {
          coordinates.push(`${wp[0]},${wp[1]}`);
        }
      }
    }

    // Destination
    if (Array.isArray(destination)) {
      coordinates.push(`${destination[0]},${destination[1]}`);
    }

    const coordsString = coordinates.join(';');
    const directionsUrl = `https://api.mapbox.com/directions/v5/${profile}/${coordsString}?geometries=polyline&overview=full&access_token=${MAPBOX_TOKEN}`;

    const response = await fetch(directionsUrl);
    const data = await response.json();

    if (data.code === 'Ok' && data.routes?.length > 0) {
      const route = data.routes[0];

      // Format totals
      const formatDistance = (meters: number) => {
        if (meters < 1000) return `${Math.round(meters)} m`;
        return `${(meters / 1000).toFixed(1)} km`;
      };

      const formatDuration = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
          return `${hours} hr ${minutes} min`;
        }
        return `${minutes} min`;
      };

      const result: DirectionsRoute = {
        legs: route.legs.map((leg: { distance: number; duration: number }) => ({
          distance: leg.distance,
          duration: leg.duration,
        })),
        geometry: route.geometry, // Already encoded polyline
        totalDistance: {
          text: formatDistance(route.distance),
          value: route.distance,
        },
        totalDuration: {
          text: formatDuration(route.duration),
          value: route.duration,
        },
        mode,
      };

      return NextResponse.json({ success: true, route: result });
    }

    return NextResponse.json({
      success: false,
      error: data.code,
      message: data.message || 'No route found'
    });
  } catch (error) {
    console.error('Mapbox Directions API error:', error);
    return NextResponse.json({ error: 'Failed to fetch directions' }, { status: 500 });
  }
}

// Mapbox polyline decoder (same format as Google's encoded polyline)
export function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    // Mapbox uses precision 5 (1e5), same as Google
    points.push([lng / 1e5, lat / 1e5]); // [lng, lat] for Mapbox
  }

  return points;
}
