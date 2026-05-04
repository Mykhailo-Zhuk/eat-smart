import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateAccessToken, generateRefreshToken } from '@/lib/jwt';
import { setRefreshTokenCookie } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimiter';

const registerSchema = z.object({
  nick: z.string().min(2, 'Nick must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  currentWeight: z.number().positive().optional(),
  targetWeight: z.number().positive().optional(),
  targetDays: z.number().int().positive().optional(),
  height: z.number().positive().optional(),
  dateOfBirth: z.string().datetime().optional(),
  sex: z.enum(['male', 'female']).optional(),
  activityLevel: z
    .enum(['sedentary', 'light', 'moderate', 'high', 'very_high'])
    .optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limiting: 5 requests per IP per 10 minutes
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';
  const rateLimitKey = `register:${ip}`;

  if (!checkRateLimit(rateLimitKey, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const {
    nick,
    email,
    password,
    currentWeight,
    targetWeight,
    targetDays,
    height,
    dateOfBirth,
    sex,
    activityLevel,
  } = parsed.data;

  try {
    // Check for existing user
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { nick }] },
      select: { email: true, nick: true },
    });

    if (existing) {
      if (existing.email === email) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'A user with this nick already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        nick,
        email,
        passwordHash,
        currentWeight,
        targetWeight,
        targetDays,
        height,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        sex,
        activityLevel,
      },
      select: { id: true, nick: true, email: true },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });

    const response = NextResponse.json(
      { accessToken, user },
      { status: 201 }
    );

    setRefreshTokenCookie(response, refreshToken);

    return response;
  } catch (error) {
    console.error('[POST /api/auth/register]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
