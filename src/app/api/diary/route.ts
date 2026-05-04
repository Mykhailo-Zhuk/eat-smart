import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseISO, startOfDay, endOfDay } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

const MEAL_CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealCategory = (typeof MEAL_CATEGORIES)[number];

const createEntrySchema = z.object({
  productId: z.string().uuid('Invalid productId'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format'),
  amount: z.number().positive('amount must be positive'),
  servingUnit: z.string().min(1, 'servingUnit is required'),
  mealCategory: z.enum(MEAL_CATEGORIES).optional(),
});

interface MealGroup {
  mealCategory: string | null;
  entries: EntryResponse[];
  totals: NutritionTotals;
}

interface NutritionTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface EntryResponse {
  id: string;
  userId: string;
  productId: string;
  date: Date;
  mealCategory: string | null;
  amount: number;
  servingUnit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    name: string;
    brand: string | null;
    caloriesPer100: number;
    proteinPer100: number;
    fatPer100: number;
    carbsPer100: number;
    servingUnit: string;
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const dateParam = searchParams.get('date');

  if (!dateParam) {
    return NextResponse.json(
      { error: 'Query parameter "date" is required (YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD' },
      { status: 400 }
    );
  }

  try {
    const targetDate = parseISO(dateParam);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    const entries = await prisma.foodEntry.findMany({
      where: {
        userId: authUser.userId,
        date: { gte: dayStart, lte: dayEnd },
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
      orderBy: [{ mealCategory: 'asc' }, { createdAt: 'asc' }],
    }) as EntryResponse[];

    // Group entries by mealCategory
    const groupMap = new Map<string, MealGroup>();

    for (const entry of entries) {
      const key = entry.mealCategory ?? 'uncategorized';
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          mealCategory: entry.mealCategory,
          entries: [],
          totals: { calories: 0, protein: 0, fat: 0, carbs: 0 },
        });
      }
      const group = groupMap.get(key)!;
      group.entries.push(entry);
      group.totals.calories += entry.calories;
      group.totals.protein += entry.protein;
      group.totals.fat += entry.fat;
      group.totals.carbs += entry.carbs;
    }

    // Round group totals
    for (const group of groupMap.values()) {
      group.totals.calories = Math.round(group.totals.calories * 10) / 10;
      group.totals.protein = Math.round(group.totals.protein * 10) / 10;
      group.totals.fat = Math.round(group.totals.fat * 10) / 10;
      group.totals.carbs = Math.round(group.totals.carbs * 10) / 10;
    }

    const groups = Array.from(groupMap.values());

    // Day-level totals
    const dayTotals: NutritionTotals = entries.reduce(
      (acc, e) => ({
        calories: acc.calories + e.calories,
        protein: acc.protein + e.protein,
        fat: acc.fat + e.fat,
        carbs: acc.carbs + e.carbs,
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );

    dayTotals.calories = Math.round(dayTotals.calories * 10) / 10;
    dayTotals.protein = Math.round(dayTotals.protein * 10) / 10;
    dayTotals.fat = Math.round(dayTotals.fat * 10) / 10;
    dayTotals.carbs = Math.round(dayTotals.carbs * 10) / 10;

    return NextResponse.json({ date: dateParam, groups, totals: dayTotals });
  } catch (error) {
    console.error('[GET /api/diary]', error);
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

  const parsed = createEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { productId, date, amount, servingUnit, mealCategory } = parsed.data;

  try {
    // Verify product belongs to this user
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        userId: true,
        caloriesPer100: true,
        proteinPer100: true,
        fatPer100: true,
        carbsPer100: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (product.userId !== authUser.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate nutrition values based on amount / 100g equivalents
    const factor = amount / 100;
    const calories = Math.round(product.caloriesPer100 * factor * 10) / 10;
    const protein = Math.round(product.proteinPer100 * factor * 10) / 10;
    const fat = Math.round(product.fatPer100 * factor * 10) / 10;
    const carbs = Math.round(product.carbsPer100 * factor * 10) / 10;

    const entryDate = parseISO(date);

    const [entry] = await prisma.$transaction([
      prisma.foodEntry.create({
        data: {
          userId: authUser.userId,
          productId,
          date: entryDate,
          mealCategory: mealCategory ?? null,
          amount,
          servingUnit,
          calories,
          protein,
          fat,
          carbs,
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
      }),
      prisma.product.update({
        where: { id: productId },
        data: { lastUsedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/diary]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
