import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

const createWeightSchema = z.object({
  weight: z
    .number()
    .min(20, 'weight must be at least 20 kg')
    .max(500, 'weight cannot exceed 500 kg'),
  loggedAt: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const daysParam = searchParams.get('days');
  const days = daysParam ? parseInt(daysParam, 10) : 90;

  if (isNaN(days) || days <= 0 || days > 3650) {
    return NextResponse.json(
      { error: 'Invalid "days" parameter. Must be a positive number up to 3650.' },
      { status: 400 }
    );
  }

  try {
    const since = subDays(new Date(), days);

    const logs = await prisma.weightLog.findMany({
      where: {
        userId: authUser.userId,
        loggedAt: { gte: since },
      },
      orderBy: { loggedAt: 'asc' },
    });

    return NextResponse.json({ logs, days });
  } catch (error) {
    console.error('[GET /api/weight]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
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

  const parsed = createWeightSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { weight, loggedAt, note } = parsed.data;

  try {
    const log = await prisma.weightLog.create({
      data: {
        userId: authUser.userId,
        weight,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
        note: note ?? null,
      },
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/weight]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
