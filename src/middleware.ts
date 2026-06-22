import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Define the paths that don't require authentication
const publicPaths = ['/login', '/api/auth/login', '/api/auth/logout'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Next.js static files and images bypass middleware automatically via the matcher, 
  // but just in case, we ignore them
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    publicPaths.includes(pathname)
  ) {
    return NextResponse.next();
  }

  // Check for the secure JWT cookie
  const token = request.cookies.get('nami_jwt_session')?.value;

  if (!token) {
    return handleUnauthorized(request);
  }

  try {
    const JWT_SECRET = new TextEncoder().encode(
      process.env.JWT_SECRET || 'fallback_secret_for_dev_only_change_in_prod'
    );
    
    // Verify the JWT token
    await jwtVerify(token, JWT_SECRET);
    
    // Token is valid, proceed
    return NextResponse.next();
  } catch (error) {
    // Token is invalid or expired
    console.error("JWT Verification failed:", error);
    return handleUnauthorized(request);
  }
}

function handleUnauthorized(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // If it's an API request, return a 401 JSON response
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { success: false, error: 'No autorizado. Por favor inicie sesión.' },
      { status: 401 }
    );
  }

  // If it's a page request, redirect to the login page
  const url = new URL('/login', request.url);
  return NextResponse.redirect(url);
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
