import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/app/lib/prisma';

// GET current user's profile
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
    });

    // Return empty object if no profile found (not an error)
    return NextResponse.json(profile || {});
  } catch (error) {
    console.error('Error fetching profile:', error);
    // Return empty object instead of 500 so client can fall back to localStorage
    return NextResponse.json({}, { status: 200 });
  }
}

// POST create or update profile
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();

    const profile = await prisma.profile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        countryOfOrigin: data.countryOfOrigin,
        passportCountry: data.passportCountry,
        travelStyle: data.travelStyle,
        riskTolerance: data.riskTolerance,
        comfortThreshold: data.comfortThreshold || [],
        travelPace: data.travelPace,
        hygieneThreshold: data.hygieneThreshold,
        partyWeight: data.partyWeight ?? 50,
        natureWeight: data.natureWeight ?? 50,
        cultureWeight: data.cultureWeight ?? 50,
        adventureWeight: data.adventureWeight ?? 50,
        relaxationWeight: data.relaxationWeight ?? 50,
        foodPreference: data.foodPreference,
        packWeight: data.packWeight,
        electronicsTolerance: data.electronicsTolerance,
        budgetStyle: data.budgetStyle,
        incomeType: data.incomeType,
        monthlyBudget: data.monthlyBudget,
        nightWalking: data.nightWalking ?? false,
        motorbikeOk: data.motorbikeOk ?? false,
        couchsurfingOk: data.couchsurfingOk ?? false,
        femaleSafety: data.femaleSafety ?? false,
        instagramSpots: data.instagramSpots ?? false,
        hiddenGems: data.hiddenGems ?? false,
        videoLocations: data.videoLocations ?? false,
        sunriseSunsetOptimization: data.sunriseSunsetOptimization ?? false,
        countriesVisited: data.countriesVisited || [],
        bucketList: data.bucketList || [],
        interests: data.interests || [],
        restrictions: data.restrictions || [],
      },
      update: {
        countryOfOrigin: data.countryOfOrigin,
        passportCountry: data.passportCountry,
        travelStyle: data.travelStyle,
        riskTolerance: data.riskTolerance,
        comfortThreshold: data.comfortThreshold || [],
        travelPace: data.travelPace,
        hygieneThreshold: data.hygieneThreshold,
        partyWeight: data.partyWeight,
        natureWeight: data.natureWeight,
        cultureWeight: data.cultureWeight,
        adventureWeight: data.adventureWeight,
        relaxationWeight: data.relaxationWeight,
        foodPreference: data.foodPreference,
        packWeight: data.packWeight,
        electronicsTolerance: data.electronicsTolerance,
        budgetStyle: data.budgetStyle,
        incomeType: data.incomeType,
        monthlyBudget: data.monthlyBudget,
        nightWalking: data.nightWalking,
        motorbikeOk: data.motorbikeOk,
        couchsurfingOk: data.couchsurfingOk,
        femaleSafety: data.femaleSafety,
        instagramSpots: data.instagramSpots,
        hiddenGems: data.hiddenGems,
        videoLocations: data.videoLocations,
        sunriseSunsetOptimization: data.sunriseSunsetOptimization,
        countriesVisited: data.countriesVisited,
        bucketList: data.bucketList,
        interests: data.interests,
        restrictions: data.restrictions,
      },
    });

    // Also update the user's name if provided
    if (data.name) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: data.name },
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error saving profile:', error);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
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
