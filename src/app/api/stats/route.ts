import { NextRequest, NextResponse } from 'next/server';
import { parseISO, startOfDay, endOfDay, subDays, differenceInYears, format } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { calculateDailyCalories } from '@/lib/calories';

interface DayStats {
  date: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface NutritionTotals {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

async function sumEntriesForRange(
  userId: string,
  from: Date,
  to: Date
): Promise<NutritionTotals> {
  const entries = await prisma.foodEntry.findMany({
    where: {
      userId,
      date: { gte: startOfDay(from), lte: endOfDay(to) },
    },
    select: { calories: true, protein: true, fat: true, carbs: true },
  });

  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      fat: acc.fat + e.fat,
      carbs: acc.carbs + e.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

function roundTotals(totals: NutritionTotals): NutritionTotals {
  return {
    calories: Math.round(totals.calories * 10) / 10,
    protein: Math.round(totals.protein * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
  };
}

async function buildDailyBreakdown(
  userId: string,
  endDate: Date,
  numDays: number
): Promise<DayStats[]> {
  const startDate = subDays(endDate, numDays - 1);

  const entries = await prisma.foodEntry.findMany({
    where: {
      userId,
      date: { gte: startOfDay(startDate), lte: endOfDay(endDate) },
    },
    select: { date: true, calories: true, protein: true, fat: true, carbs: true },
  });

  // Build a map keyed by YYYY-MM-DD
  const dayMap = new Map<string, NutritionTotals>();

  for (const entry of entries) {
    const key = format(entry.date, 'yyyy-MM-dd');
    const existing = dayMap.get(key) ?? { calories: 0, protein: 0, fat: 0, carbs: 0 };
    dayMap.set(key, {
      calories: existing.calories + entry.calories,
      protein: existing.protein + entry.protein,
      fat: existing.fat + entry.fat,
      carbs: existing.carbs + entry.carbs,
    });
  }

  // Build array for all days in the range (including zeros)
  const result: DayStats[] = [];
  for (let i = 0; i < numDays; i++) {
    const day = subDays(endDate, numDays - 1 - i);
    const key = format(day, 'yyyy-MM-dd');
    const totals = dayMap.get(key) ?? { calories: 0, protein: 0, fat: 0, carbs: 0 };
    result.push({ date: key, ...roundTotals(totals) });
  }

  return result;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') ?? 'daily';
  const dateParam = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd');

  if (!['daily', 'weekly', 'monthly'].includes(type)) {
    return NextResponse.json(
      { error: 'Invalid type. Must be daily, weekly, or monthly.' },
      { status: 400 }
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json(
      { error: 'Invalid date format. Use YYYY-MM-DD.' },
      { status: 400 }
    );
  }

  try {
    const targetDate = parseISO(dateParam);

    // Fetch user for daily calorie goal
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        sex: true,
        currentWeight: true,
        height: true,
        dateOfBirth: true,
        activityLevel: true,
        targetWeight: true,
        targetDays: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let dailyCalorieGoal: number | null = null;
    if (
      user.sex &&
      user.currentWeight &&
      user.height &&
      user.dateOfBirth &&
      user.activityLevel
    ) {
      const age = differenceInYears(new Date(), user.dateOfBirth);
      if (age > 0) {
        dailyCalorieGoal = calculateDailyCalories({
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

    if (type === 'daily') {
      const today = roundTotals(
        await sumEntriesForRange(authUser.userId, targetDate, targetDate)
      );

      const yesterday = roundTotals(
        await sumEntriesForRange(
          authUser.userId,
          subDays(targetDate, 1),
          subDays(targetDate, 1)
        )
      );

      const delta: NutritionTotals = {
        calories: Math.round((today.calories - yesterday.calories) * 10) / 10,
        protein: Math.round((today.protein - yesterday.protein) * 10) / 10,
        fat: Math.round((today.fat - yesterday.fat) * 10) / 10,
        carbs: Math.round((today.carbs - yesterday.carbs) * 10) / 10,
      };

      return NextResponse.json({
        type,
        date: dateParam,
        totals: today,
        previousDay: yesterday,
        delta,
        dailyCalorieGoal,
      });
    }

    if (type === 'weekly') {
      const days = await buildDailyBreakdown(authUser.userId, targetDate, 7);
      const totals = roundTotals(
        days.reduce(
          (acc, d) => ({
            calories: acc.calories + d.calories,
            protein: acc.protein + d.protein,
            fat: acc.fat + d.fat,
            carbs: acc.carbs + d.carbs,
          }),
          { calories: 0, protein: 0, fat: 0, carbs: 0 }
        )
      );

      return NextResponse.json({
        type,
        date: dateParam,
        days,
        totals,
        dailyCalorieGoal,
      });
    }

    // monthly
    const days = await buildDailyBreakdown(authUser.userId, targetDate, 30);
    const totals = roundTotals(
      days.reduce(
        (acc, d) => ({
          calories: acc.calories + d.calories,
          protein: acc.protein + d.protein,
          fat: acc.fat + d.fat,
          carbs: acc.carbs + d.carbs,
        }),
        { calories: 0, protein: 0, fat: 0, carbs: 0 }
      )
    );

    return NextResponse.json({
      type,
      date: dateParam,
      days,
      totals,
      dailyCalorieGoal,
    });
  } catch (error) {
    console.error('[GET /api/stats]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
