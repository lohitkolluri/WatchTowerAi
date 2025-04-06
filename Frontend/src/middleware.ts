import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
const publicPaths = ['/auth/login', '/auth/register', '/auth/forgot-password'];

export function middleware(request: NextRequest) {
  // Get the path the user is trying to access
  const path = request.nextUrl.pathname;

  // Check if token exists in cookies
  const token = request.cookies.get('token')?.value;

  // Check if the user is trying to access a public path
  const isPublicPath = publicPaths.some(publicPath => path.startsWith(publicPath));

  // If user is not authenticated and trying to access a protected route
  if (!token && !isPublicPath) {
    // Create the URL for the login page with the current URL as a redirect parameter
    const loginUrl = new URL('/auth/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If user is authenticated and trying to access an auth page
  if (token && isPublicPath) {
    // Create the URL for the home page
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  // Allow the request to proceed
  return NextResponse.next();
}

// Apply middleware to all routes except public assets
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
