import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

// Escape a CSV field: wrap in double-quotes if it contains commas, quotes, or newlines
function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map(csvField).join(',');
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const formatParam = (searchParams.get('format') ?? 'json').toLowerCase();

  if (formatParam !== 'csv' && formatParam !== 'json') {
    return NextResponse.json(
      { error: 'Invalid format. Use "csv" or "json".' },
      { status: 400 }
    );
  }

  try {
    const [foodEntries, weightLogs] = await Promise.all([
      prisma.foodEntry.findMany({
        where: { userId: authUser.userId },
        include: {
          product: {
            select: {
              name: true,
              brand: true,
              category: true,
              caloriesPer100: true,
              proteinPer100: true,
              fatPer100: true,
              carbsPer100: true,
              servingUnit: true,
            },
          },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.weightLog.findMany({
        where: { userId: authUser.userId },
        orderBy: { loggedAt: 'asc' },
      }),
    ]);

    const exportedAt = new Date().toISOString();
    const dateStamp = format(new Date(), 'yyyy-MM-dd');

    if (formatParam === 'json') {
      const payload = {
        exportedAt,
        userId: authUser.userId,
        foodEntries: foodEntries.map((e) => ({
          id: e.id,
          date: format(e.date, 'yyyy-MM-dd'),
          mealCategory: e.mealCategory,
          amount: e.amount,
          servingUnit: e.servingUnit,
          calories: e.calories,
          protein: e.protein,
          fat: e.fat,
          carbs: e.carbs,
          product: {
            name: e.product.name,
            brand: e.product.brand,
            category: e.product.category,
            caloriesPer100: e.product.caloriesPer100,
            proteinPer100: e.product.proteinPer100,
            fatPer100: e.product.fatPer100,
            carbsPer100: e.product.carbsPer100,
            servingUnit: e.product.servingUnit,
          },
          createdAt: e.createdAt.toISOString(),
        })),
        weightLogs: weightLogs.map((w) => ({
          id: w.id,
          weight: w.weight,
          loggedAt: w.loggedAt.toISOString(),
          note: w.note,
        })),
      };

      return new NextResponse(JSON.stringify(payload, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="eat-smart-export-${dateStamp}.json"`,
        },
      });
    }

    // CSV format — two sections separated by blank lines
    const lines: string[] = [];

    // Food entries section
    lines.push('# Food Entries');
    lines.push(
      buildCsvRow([
        'date',
        'mealCategory',
        'productName',
        'productBrand',
        'productCategory',
        'amount',
        'servingUnit',
        'calories',
        'protein_g',
        'fat_g',
        'carbs_g',
        'caloriesPer100',
        'proteinPer100',
        'fatPer100',
        'carbsPer100',
        'createdAt',
      ])
    );

    for (const e of foodEntries) {
      lines.push(
        buildCsvRow([
          format(e.date, 'yyyy-MM-dd'),
          e.mealCategory,
          e.product.name,
          e.product.brand,
          e.product.category,
          e.amount,
          e.servingUnit,
          e.calories,
          e.protein,
          e.fat,
          e.carbs,
          e.product.caloriesPer100,
          e.product.proteinPer100,
          e.product.fatPer100,
          e.product.carbsPer100,
          e.createdAt.toISOString(),
        ])
      );
    }

    lines.push('');
    lines.push('# Weight Logs');
    lines.push(buildCsvRow(['loggedAt', 'weight_kg', 'note']));

    for (const w of weightLogs) {
      lines.push(buildCsvRow([w.loggedAt.toISOString(), w.weight, w.note]));
    }

    const csvBody = lines.join('\r\n');

    return new NextResponse(csvBody, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="eat-smart-export-${dateStamp}.csv"`,
      },
    });
  } catch (error) {
    console.error('[GET /api/export]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
