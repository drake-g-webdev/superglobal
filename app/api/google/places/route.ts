import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function POST(request: NextRequest) {
  console.log('[Places API] Request received');

  if (!GOOGLE_API_KEY) {
    console.error('[Places API] No Google Maps API key configured');
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
  }

  try {
    const { placeId, query, location } = await request.json();
    console.log('[Places API] Params:', { placeId, query, location });

    // If we have a placeId, get place details
    if (placeId) {
      const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      detailsUrl.searchParams.set('place_id', placeId);
      detailsUrl.searchParams.set('fields', 'name,formatted_address,geometry,photos,rating,user_ratings_total,types,opening_hours,website,formatted_phone_number,price_level,reviews');
      detailsUrl.searchParams.set('key', GOOGLE_API_KEY);

      const response = await fetch(detailsUrl.toString());
      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        const place = data.result;
        return NextResponse.json({
          success: true,
          place: {
            placeId,
            name: place.name,
            address: place.formatted_address,
            coordinates: place.geometry?.location ? [place.geometry.location.lng, place.geometry.location.lat] : null,
            rating: place.rating,
            reviewCount: place.user_ratings_total,
            types: place.types,
            openingHours: place.opening_hours?.weekday_text,
            website: place.website,
            phone: place.formatted_phone_number,
            priceLevel: place.price_level,
            photos: place.photos?.slice(0, 5).map((p: { photo_reference: string }) => ({
              reference: p.photo_reference,
              url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photo_reference}&key=${GOOGLE_API_KEY}`,
            })) || [],
          },
        });
      }

      return NextResponse.json({ success: false, error: data.status });
    }

    // Otherwise search for places by query
    if (query) {
      console.log('[Places API] Searching for query:', query);
      const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      searchUrl.searchParams.set('query', query);
      if (location) {
        searchUrl.searchParams.set('location', `${location[1]},${location[0]}`); // lat,lng
        searchUrl.searchParams.set('radius', '50000'); // 50km radius
      }
      searchUrl.searchParams.set('key', GOOGLE_API_KEY);

      console.log('[Places API] Fetching from Google:', searchUrl.toString().replace(GOOGLE_API_KEY, 'API_KEY_HIDDEN'));
      const response = await fetch(searchUrl.toString());
      const data = await response.json();
      console.log('[Places API] Google response status:', data.status, 'results count:', data.results?.length || 0);

      if (data.status === 'OK' && data.results?.length > 0) {
        const place = data.results[0];
        const coords = place.geometry?.location ? [place.geometry.location.lng, place.geometry.location.lat] : null;

        // Log all results to see what Google is returning
        console.log('[Places API] ===== SEARCH RESULTS =====');
        console.log('[Places API] Query:', query);
        console.log('[Places API] Total results:', data.results.length);
        data.results.slice(0, 5).forEach((r: { name: string; formatted_address: string; geometry?: { location?: { lat: number; lng: number } }; types?: string[] }, i: number) => {
          console.log(`[Places API] Result ${i + 1}:`, {
            name: r.name,
            address: r.formatted_address,
            coords: r.geometry?.location ? [r.geometry.location.lng, r.geometry.location.lat] : null,
            types: r.types?.slice(0, 3),
          });
        });
        console.log('[Places API] ===== SELECTED =====');
        console.log('[Places API] Selected:', place.name);
        console.log('[Places API] Address:', place.formatted_address);
        console.log('[Places API] Coordinates:', coords);
        console.log('[Places API] Types:', place.types);

        const result = {
          success: true,
          place: {
            placeId: place.place_id,
            name: place.name,
            address: place.formatted_address,
            coordinates: coords,
            rating: place.rating,
            reviewCount: place.user_ratings_total,
            types: place.types,
            photos: place.photos?.slice(0, 3).map((p: { photo_reference: string }) => ({
              reference: p.photo_reference,
              url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photo_reference}&key=${GOOGLE_API_KEY}`,
            })) || [],
          },
        };
        console.log('[Places API] Returning coords:', result.place.coordinates);
        return NextResponse.json(result);
      }

      console.warn('[Places API] ===== NO RESULTS =====');
      console.warn('[Places API] Query that failed:', query);
      console.warn('[Places API] Status:', data.status);
      console.warn('[Places API] Error message:', data.error_message);
      return NextResponse.json({ success: false, error: data.status || 'No results found', errorMessage: data.error_message });
    }

    return NextResponse.json({ error: 'Missing placeId or query' }, { status: 400 });
  } catch (error) {
    console.error('Google Places API error:', error);
    return NextResponse.json({ error: 'Failed to fetch place data' }, { status: 500 });
  }
}
