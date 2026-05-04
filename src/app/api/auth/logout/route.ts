import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearRefreshTokenCookie } from '@/lib/auth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get('refreshToken')?.value;

  if (refreshToken) {
    try {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    } catch (error) {
      // Log but don't fail — we still want to clear the cookie
      console.error('[POST /api/auth/logout] Failed to delete refresh token:', error);
    }
  }

  const response = NextResponse.json({ success: true });
  clearRefreshTokenCookie(response);

  return response;
}
