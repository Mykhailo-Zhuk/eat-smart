import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateAccessToken, verifyRefreshToken } from '@/lib/jwt';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const refreshToken = request.cookies.get('refreshToken')?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { error: 'Refresh token not found' },
      { status: 401 }
    );
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return NextResponse.json(
      { error: 'Invalid or expired refresh token' },
      { status: 401 }
    );
  }

  try {
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      select: { id: true, userId: true, expiresAt: true },
    });

    if (!storedToken) {
      return NextResponse.json(
        { error: 'Refresh token not found in database' },
        { status: 401 }
      );
    }

    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      return NextResponse.json(
        { error: 'Refresh token has expired' },
        { status: 401 }
      );
    }

    if (storedToken.userId !== payload.userId) {
      return NextResponse.json(
        { error: 'Token user mismatch' },
        { status: 401 }
      );
    }

    const accessToken = generateAccessToken(storedToken.userId);

    return NextResponse.json({ accessToken });
  } catch (error) {
    console.error('[POST /api/auth/refresh]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
