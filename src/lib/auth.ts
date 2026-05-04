import { NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/jwt';

export async function getAuthUser(request: Request): Promise<{ userId: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return null;
  }

  return verifyAccessToken(token);
}

export function setRefreshTokenCookie(response: NextResponse, token: string): void {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  response.cookies.set('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: thirtyDaysMs / 1000,
    path: '/',
  });
}

export function clearRefreshTokenCookie(response: NextResponse): void {
  response.cookies.set('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}
