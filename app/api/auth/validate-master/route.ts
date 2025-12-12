import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIP, MASTER_PASSWORD_RATE_LIMIT } from '@/app/lib/rateLimit';

// Server-side master password validation
// The password is stored in a non-NEXT_PUBLIC env var so it's never exposed to the client
const MASTER_PASSWORD = process.env.MASTER_PASSWORD || process.env.NEXT_PUBLIC_MASTER_PASSWORD;

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - prevent brute force attacks
    const clientIP = getClientIP(request);
    const rateLimitKey = `master-password:${clientIP}`;
    const rateLimit = checkRateLimit(rateLimitKey, MASTER_PASSWORD_RATE_LIMIT);

    if (!rateLimit.success) {
      console.warn(`[Auth] Rate limit exceeded for IP: ${clientIP}`);
      return NextResponse.json(
        {
          valid: false,
          error: 'Too many attempts. Please try again later.',
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimit.resetTime),
          },
        }
      );
    }

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
      console.warn(`[Auth] Invalid master password attempt from IP: ${clientIP}`);
    }

    // Add rate limit headers to response
    const response = NextResponse.json({ valid: isValid });
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateLimit.resetTime));
    return response;
  } catch (error) {
    console.error('[Auth] Master password validation error:', error);
    return NextResponse.json(
      { valid: false, error: 'Validation failed' },
      { status: 500 }
    );
  }
}
