import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

const MEAL_CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

const patchEntrySchema = z.object({
  amount: z.number().positive('amount must be positive').optional(),
  mealCategory: z.enum(MEAL_CATEGORIES).nullable().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = patchEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { amount, mealCategory } = parsed.data;

  if (amount === undefined && mealCategory === undefined) {
    return NextResponse.json(
      { error: 'No updatable fields provided' },
      { status: 400 }
    );
  }

  try {
    const existing = await prisma.foodEntry.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            caloriesPer100: true,
            proteinPer100: true,
            fatPer100: true,
            carbsPer100: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Food entry not found' }, { status: 404 });
    }

    if (existing.userId !== authUser.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Recalculate nutrition if amount changed
    const newAmount = amount ?? existing.amount;
    const factor = newAmount / 100;
    const calories = Math.round(existing.product.caloriesPer100 * factor * 10) / 10;
    const protein = Math.round(existing.product.proteinPer100 * factor * 10) / 10;
    const fat = Math.round(existing.product.fatPer100 * factor * 10) / 10;
    const carbs = Math.round(existing.product.carbsPer100 * factor * 10) / 10;

    const entry = await prisma.foodEntry.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount, calories, protein, fat, carbs }),
        ...(mealCategory !== undefined && { mealCategory }),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            caloriesPer100: true,
            proteinPer100: true,
            fatPer100: true,
            carbsPer100: true,
            servingUnit: true,
          },
        },
      },
    });

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('[PATCH /api/diary/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const existing = await prisma.foodEntry.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Food entry not found' }, { status: 404 });
    }

    if (existing.userId !== authUser.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.foodEntry.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/diary/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
