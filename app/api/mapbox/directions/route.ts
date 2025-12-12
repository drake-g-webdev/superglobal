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

    // Encode a simple polyline from two points (for straight-line fallback)
    const encodeSimplePolyline = (coords: number[][]): string => {
      let encoded = '';
      let prevLat = 0;
      let prevLng = 0;

      for (const [lng, lat] of coords) {
        const latInt = Math.round(lat * 1e5);
        const lngInt = Math.round(lng * 1e5);

        encoded += encodeNumber(latInt - prevLat);
        encoded += encodeNumber(lngInt - prevLng);

        prevLat = latInt;
        prevLng = lngInt;
      }

      return encoded;
    };

    const encodeNumber = (num: number): string => {
      let sgn_num = num << 1;
      if (num < 0) {
        sgn_num = ~sgn_num;
      }
      let encoded = '';
      while (sgn_num >= 0x20) {
        encoded += String.fromCharCode((0x20 | (sgn_num & 0x1f)) + 63);
        sgn_num >>= 5;
      }
      encoded += String.fromCharCode(sgn_num + 63);
      return encoded;
    };

    if (data.code === 'Ok' && data.routes?.length > 0) {
      const route = data.routes[0];

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

    // NoRoute fallback: Create a straight-line route (for islands, ferries, etc.)
    if (data.code === 'NoRoute' || data.code === 'NoSegment') {
      // Calculate straight-line distance using Haversine formula
      const toRad = (deg: number) => deg * Math.PI / 180;
      const lat1 = toRad(origin[1]);
      const lat2 = toRad(destination[1]);
      const dLat = toRad(destination[1] - origin[1]);
      const dLng = toRad(destination[0] - origin[0]);

      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceMeters = 6371000 * c; // Earth radius in meters

      // Estimate duration: assume ~30km/h average for ferry/boat travel
      const durationSeconds = Math.round(distanceMeters / 30000 * 3600);

      // Create a straight-line polyline
      const straightLineGeometry = encodeSimplePolyline([origin, destination]);

      const fallbackResult: DirectionsRoute = {
        legs: [{
          distance: distanceMeters,
          duration: durationSeconds,
        }],
        geometry: straightLineGeometry,
        totalDistance: {
          text: formatDistance(distanceMeters),
          value: distanceMeters,
        },
        totalDuration: {
          text: formatDuration(durationSeconds) + ' (est.)',
          value: durationSeconds,
        },
        mode: 'ferry', // Indicate this is a ferry/boat route
      };

      return NextResponse.json({
        success: true,
        route: fallbackResult,
        isFallback: true,
        fallbackReason: 'No road route available - may require ferry or boat'
      });
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
