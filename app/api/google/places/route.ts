import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export async function POST(request: NextRequest) {
  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: 'Google Maps API key not configured' }, { status: 500 });
  }

  try {
    const { placeId, query, location } = await request.json();

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
      const searchUrl = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      searchUrl.searchParams.set('query', query);
      if (location) {
        searchUrl.searchParams.set('location', `${location[1]},${location[0]}`); // lat,lng
        searchUrl.searchParams.set('radius', '50000'); // 50km radius
      }
      searchUrl.searchParams.set('key', GOOGLE_API_KEY);

      const response = await fetch(searchUrl.toString());
      const data = await response.json();

      if (data.status === 'OK' && data.results?.length > 0) {
        const place = data.results[0];
        return NextResponse.json({
          success: true,
          place: {
            placeId: place.place_id,
            name: place.name,
            address: place.formatted_address,
            coordinates: place.geometry?.location ? [place.geometry.location.lng, place.geometry.location.lat] : null,
            rating: place.rating,
            reviewCount: place.user_ratings_total,
            types: place.types,
            photos: place.photos?.slice(0, 3).map((p: { photo_reference: string }) => ({
              reference: p.photo_reference,
              url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photo_reference}&key=${GOOGLE_API_KEY}`,
            })) || [],
          },
        });
      }

      return NextResponse.json({ success: false, error: data.status || 'No results found' });
    }

    return NextResponse.json({ error: 'Missing placeId or query' }, { status: 400 });
  } catch (error) {
    console.error('Google Places API error:', error);
    return NextResponse.json({ error: 'Failed to fetch place data' }, { status: 500 });
  }
}
