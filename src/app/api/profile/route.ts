import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { differenceInYears } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { calculateDailyCalories } from '@/lib/calories';

const patchSchema = z.object({
  nick: z.string().min(2).optional(),
  height: z.number().positive().optional(),
  sex: z.enum(['male', 'female']).optional(),
  activityLevel: z
    .enum(['sedentary', 'light', 'moderate', 'high', 'very_high'])
    .optional(),
  currentWeight: z.number().positive().optional(),
  targetWeight: z.number().positive().optional(),
  targetDays: z.number().int().positive().optional(),
  dateOfBirth: z.string().datetime().optional(),
});

function buildProfileResponse(user: {
  id: string;
  nick: string;
  email: string;
  height: number | null;
  dateOfBirth: Date | null;
  sex: string | null;
  activityLevel: string | null;
  currentWeight: number | null;
  targetWeight: number | null;
  targetDays: number | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  let dailyCalories: number | null = null;

  if (
    user.sex &&
    user.currentWeight &&
    user.height &&
    user.dateOfBirth &&
    user.activityLevel
  ) {
    const age = differenceInYears(new Date(), user.dateOfBirth);
    if (age > 0) {
      dailyCalories = calculateDailyCalories({
        sex: user.sex,
        weight: user.currentWeight,
        height: user.height,
        age,
        activityLevel: user.activityLevel,
        targetWeight: user.targetWeight,
        targetDays: user.targetDays,
      });
    }
  }

  return { ...user, dailyCalories };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        nick: true,
        email: true,
        height: true,
        dateOfBirth: true,
        sex: true,
        activityLevel: true,
        currentWeight: true,
        targetWeight: true,
        targetDays: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(buildProfileResponse(user));
  } catch (error) {
    console.error('[GET /api/profile]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { nick, height, sex, activityLevel, currentWeight, targetWeight, targetDays, dateOfBirth } =
    parsed.data;

  try {
    if (nick) {
      const conflict = await prisma.user.findFirst({
        where: { nick, NOT: { id: authUser.userId } },
        select: { id: true },
      });
      if (conflict) {
        return NextResponse.json(
          { error: 'Nick is already taken' },
          { status: 409 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: authUser.userId },
      data: {
        ...(nick !== undefined && { nick }),
        ...(height !== undefined && { height }),
        ...(sex !== undefined && { sex }),
        ...(activityLevel !== undefined && { activityLevel }),
        ...(currentWeight !== undefined && { currentWeight }),
        ...(targetWeight !== undefined && { targetWeight }),
        ...(targetDays !== undefined && { targetDays }),
        ...(dateOfBirth !== undefined && { dateOfBirth: new Date(dateOfBirth) }),
      },
      select: {
        id: true,
        nick: true,
        email: true,
        height: true,
        dateOfBirth: true,
        sex: true,
        activityLevel: true,
        currentWeight: true,
        targetWeight: true,
        targetDays: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(buildProfileResponse(updatedUser));
  } catch (error) {
    console.error('[PATCH /api/profile]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
