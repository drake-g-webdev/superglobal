import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export interface DirectionsLeg {
  startAddress: string;
  endAddress: string;
  distance: { text: string; value: number }; // value in meters
  duration: { text: string; value: number }; // value in seconds
}

export interface DirectionsRoute {
  legs: DirectionsLeg[];
  overviewPolyline: string; // Encoded polyline for drawing on map
  totalDistance: { text: string; value: number };
  totalDuration: { text: string; value: number };
  mode: string;
}

export async function POST(request: NextRequest) {
  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
  }

  try {
    const { origin, destination, waypoints, mode = 'driving' } = await request.json();

    // origin/destination can be: [lng, lat] coordinates or place_id strings
    // waypoints: array of [lng, lat] or place_id strings
    // mode: driving, walking, transit, bicycling

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Origin and destination required' }, { status: 400 });
    }

    const directionsUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');

    // Format origin
    if (Array.isArray(origin)) {
      directionsUrl.searchParams.set('origin', `${origin[1]},${origin[0]}`); // lat,lng
    } else {
      directionsUrl.searchParams.set('origin', `place_id:${origin}`);
    }

    // Format destination
    if (Array.isArray(destination)) {
      directionsUrl.searchParams.set('destination', `${destination[1]},${destination[0]}`); // lat,lng
    } else {
      directionsUrl.searchParams.set('destination', `place_id:${destination}`);
    }

    // Format waypoints if provided
    if (waypoints && waypoints.length > 0) {
      const waypointStr = waypoints.map((wp: [number, number] | string) => {
        if (Array.isArray(wp)) {
          return `${wp[1]},${wp[0]}`; // lat,lng
        }
        return `place_id:${wp}`;
      }).join('|');
      directionsUrl.searchParams.set('waypoints', waypointStr);
    }

    directionsUrl.searchParams.set('mode', mode);
    directionsUrl.searchParams.set('key', GOOGLE_API_KEY);

    const response = await fetch(directionsUrl.toString());
    const data = await response.json();

    if (data.status === 'OK' && data.routes?.length > 0) {
      const route = data.routes[0];

      // Calculate totals
      let totalDistanceValue = 0;
      let totalDurationValue = 0;

      const legs: DirectionsLeg[] = route.legs.map((leg: {
        start_address: string;
        end_address: string;
        distance: { text: string; value: number };
        duration: { text: string; value: number };
      }) => {
        totalDistanceValue += leg.distance.value;
        totalDurationValue += leg.duration.value;
        return {
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          distance: leg.distance,
          duration: leg.duration,
        };
      });

      // Format totals
      const formatDistance = (meters: number) => {
        if (meters < 1000) return `${meters} m`;
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
        legs,
        overviewPolyline: route.overview_polyline.points,
        totalDistance: {
          text: formatDistance(totalDistanceValue),
          value: totalDistanceValue,
        },
        totalDuration: {
          text: formatDuration(totalDurationValue),
          value: totalDurationValue,
        },
        mode,
      };

      return NextResponse.json({ success: true, route: result });
    }

    return NextResponse.json({
      success: false,
      error: data.status,
      message: data.error_message || 'No route found'
    });
  } catch (error) {
    console.error('Google Directions API error:', error);
    return NextResponse.json({ error: 'Failed to fetch directions' }, { status: 500 });
  }
}

// Helper to decode Google's encoded polyline format
// This is useful client-side, but we'll keep it here for reference
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

    points.push([lng / 1e5, lat / 1e5]); // [lng, lat] for Mapbox
  }

  return points;
}
