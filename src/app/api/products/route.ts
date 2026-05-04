import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  shortName: z.string().optional(),
  brand: z.string().optional(),
  description: z.string().optional(),
  photoUrl: z.string().url().optional(),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  barcode: z.string().optional(),

  caloriesPer100: z
    .number()
    .positive('caloriesPer100 must be positive')
    .max(900, 'caloriesPer100 cannot exceed 900'),
  proteinPer100: z
    .number()
    .min(0)
    .max(100, 'proteinPer100 cannot exceed 100')
    .optional()
    .default(0),
  fatPer100: z
    .number()
    .min(0)
    .max(100, 'fatPer100 cannot exceed 100')
    .optional()
    .default(0),
  carbsPer100: z
    .number()
    .min(0)
    .max(100, 'carbsPer100 cannot exceed 100')
    .optional()
    .default(0),
  sugarPer100: z.number().min(0).max(100).optional(),
  fiberPer100: z.number().min(0).max(100).optional(),
  saltPer100: z.number().min(0).max(100).optional(),

  servingUnit: z.string().optional().default('g'),
  baseServing: z.number().positive().optional().default(100),

  source: z.string().optional().default('manual'),
  isFavorite: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authUser = await getAuthUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const query = searchParams.get('q') ?? searchParams.get('search') ?? '';

  try {
    const products = await prisma.product.findMany({
      where: {
        userId: authUser.userId,
        ...(query
          ? {
              OR: [
                { name: { contains: query } },
                { brand: { contains: query } },
                { barcode: { contains: query } },
              ],
            }
          : {}),
      },
      orderBy: [{ lastUsedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error('[GET /api/products]', error);
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

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  try {
    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        userId: authUser.userId,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/products]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
