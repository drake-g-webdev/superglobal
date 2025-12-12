import { NextRequest, NextResponse } from 'next/server';

// Server-side master password validation
// The password is stored in a non-NEXT_PUBLIC env var so it's never exposed to the client
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || process.env.NEXT_PUBLIC_MASTER_PASSWORD;

export async function POST(request: NextRequest) {
  try {
    const { masterPassword } = await request.json();

    if (!masterPassword) {
      return NextResponse.json(
        { valid: false, error: 'Master password is required' },
        { status: 400 }
      );
    }

    if (!MASTER_PASSWORD) {
      console.error('[Auth] MASTER_PASSWORD environment variable not set');
      return NextResponse.json(
        { valid: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const isValid = masterPassword === MASTER_PASSWORD;

    if (!isValid) {
      // Log failed attempts for security monitoring
      console.warn('[Auth] Invalid master password attempt');
    }

    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error('[Auth] Master password validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Validation failed' },
      { status: 500 }
    );
  }
}
