import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Routes that require authentication
const protectedRoutes = ['/app'];

// Routes that should redirect to /app if already authenticated
const authRoutes = ['/auth/login', '/auth/signup'];

// API routes that require authentication (most do)
const protectedApiRoutes = [
  '/api/trips',
  '/api/chats',
  '/api/profile',
  '/api/chat',
];

// API routes that don't require auth
const publicApiRoutes = [
  '/api/auth',
  '/api/beta',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get the token (session)
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;

  // Protect /app routes - redirect to login if not authenticated
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users away from auth pages
  if (authRoutes.some(route => pathname.startsWith(route))) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/app', request.url));
    }
  }

  // Protect API routes - return 401 if not authenticated
  if (pathname.startsWith('/api/')) {
    // Skip public API routes
    if (publicApiRoutes.some(route => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    // Check if this is a protected API route
    if (protectedApiRoutes.some(route => pathname.startsWith(route))) {
      if (!isAuthenticated) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Only add HSTS in production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  return response;
}

// Configure which routes the middleware runs on
export const config = {
  matcher: [
    // Match all routes except static files and images
    '/((?!_next/static|_next/image|favicon.ico|images|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
