import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

// GET current user's profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log('[Profile API] GET request, session user id:', session?.user?.id);

    if (!session?.user?.id) {
      console.log('[Profile API] GET - Unauthorized, no session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch profile with user's name
    const [profile, user] = await Promise.all([
      prisma.profile.findUnique({
        where: { userId: session.user.id },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      }),
    ]);

    console.log('[Profile API] GET - Found profile:', profile ? 'yes' : 'no');
    console.log('[Profile API] GET - User name:', user?.name);
    if (profile) {
      console.log('[Profile API] GET - Profile fields:', JSON.stringify({
        id: profile.id,
        userId: profile.userId,
        countryOfOrigin: profile.countryOfOrigin,
        travelStyle: profile.travelStyle,
        riskTolerance: profile.riskTolerance,
        travelPace: profile.travelPace,
        monthlyBudget: profile.monthlyBudget,
        partyWeight: profile.partyWeight,
        foodPreference: profile.foodPreference,
      }, null, 2));
    } else {
      console.log('[Profile API] GET - No profile found in database');
    }

    // Return profile with user's name included
    if (profile) {
      return NextResponse.json({ ...profile, name: user?.name || null });
    }

    // Return empty object if no profile found (not an error)
    return NextResponse.json({});
  } catch (error) {
    console.error('[Profile API] GET Error:', error);
    // Return empty object instead of 500 so client can fall back to localStorage
    return NextResponse.json({}, { status: 200 });
  }
}

// POST create or update profile
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('[Profile API] POST request, session:', session?.user?.id ? 'authenticated' : 'unauthenticated');

    if (!session?.user?.id) {
      console.log('[Profile API] Unauthorized - no session user id');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    console.log('[Profile API] Saving profile for user:', session.user.id);
    console.log('[Profile API] POST data received:', {
      countryOfOrigin: data.countryOfOrigin,
      travelStyle: data.travelStyle,
      riskTolerance: data.riskTolerance,
      budgetStyle: data.budgetStyle,
    });

    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        countryOfOrigin: data.countryOfOrigin,
        travelStyle: data.travelStyle,
        riskTolerance: data.riskTolerance,
        comfortThreshold: data.comfortThreshold || [],
        travelPace: data.travelPace,
        partyWeight: data.partyWeight ?? 50,
        natureWeight: data.natureWeight ?? 50,
        cultureWeight: data.cultureWeight ?? 50,
        adventureWeight: data.adventureWeight ?? 50,
        relaxationWeight: data.relaxationWeight ?? 50,
        foodPreference: data.foodPreference,
        packWeight: data.packWeight,
        electronicsTolerance: data.electronicsTolerance,
        budgetStyle: data.budgetStyle,
        nightWalking: data.nightWalking ?? false,
        motorbikeOk: data.motorbikeOk ?? false,
        couchsurfingOk: data.couchsurfingOk ?? false,
        femaleSafety: data.femaleSafety ?? false,
        instagramSpots: data.instagramSpots ?? false,
        hiddenGems: data.hiddenGems ?? false,
        videoLocations: data.videoLocations ?? false,
        countriesVisited: data.countriesVisited || [],
        bucketList: data.bucketList || [],
        interests: data.interests || [],
        restrictions: data.restrictions || [],
      },
      update: {
        countryOfOrigin: data.countryOfOrigin,
        travelStyle: data.travelStyle,
        riskTolerance: data.riskTolerance,
        comfortThreshold: data.comfortThreshold || [],
        travelPace: data.travelPace,
        partyWeight: data.partyWeight,
        natureWeight: data.natureWeight,
        cultureWeight: data.cultureWeight,
        adventureWeight: data.adventureWeight,
        relaxationWeight: data.relaxationWeight,
        foodPreference: data.foodPreference,
        packWeight: data.packWeight,
        electronicsTolerance: data.electronicsTolerance,
        budgetStyle: data.budgetStyle,
        nightWalking: data.nightWalking,
        motorbikeOk: data.motorbikeOk,
        couchsurfingOk: data.couchsurfingOk,
        femaleSafety: data.femaleSafety,
        instagramSpots: data.instagramSpots,
        hiddenGems: data.hiddenGems,
        videoLocations: data.videoLocations,
        countriesVisited: data.countriesVisited,
        bucketList: data.bucketList,
        interests: data.interests,
        restrictions: data.restrictions,
      },
    });

    console.log('[Profile API] POST - Profile saved successfully:', {
      id: profile.id,
      countryOfOrigin: profile.countryOfOrigin,
      riskTolerance: profile.riskTolerance,
      travelPace: profile.travelPace,
    });

    // Also update the user's name if provided
    if (data.name) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: data.name },
      });
      console.log('[Profile API] POST - User name updated to:', data.name);
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('[Profile API] Error saving profile:', error);
    // Include more error details in response for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to save profile', details: errorMessage }, { status: 500 });
  }
}

// DELETE user's profile
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.profile.delete({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting profile:', error);
    return NextResponse.json({ error: 'Failed to delete profile' }, { status: 500 });
  }
}
