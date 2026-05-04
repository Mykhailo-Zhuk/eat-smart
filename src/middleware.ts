import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/jwt';

const PROTECTED_PREFIXES = [
  '/api/diary',
  '/api/products',
  '/api/weight',
  '/api/profile',
  '/api/stats',
  '/api/export',
];

const AUTH_PREFIX = '/api/auth';

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // Allow all auth routes without protection
  if (pathname.startsWith(AUTH_PREFIX)) {
    return NextResponse.next();
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Unauthorized: missing or malformed Authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized: empty token' },
      { status: 401 }
    );
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Unauthorized: invalid or expired token' },
      { status: 401 }
    );
  }

  // Forward userId via a custom header so route handlers can trust it if needed
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    '/api/diary/:path*',
    '/api/products/:path*',
    '/api/weight/:path*',
    '/api/profile/:path*',
    '/api/stats/:path*',
    '/api/export/:path*',
    '/api/auth/:path*',
  ],
};
