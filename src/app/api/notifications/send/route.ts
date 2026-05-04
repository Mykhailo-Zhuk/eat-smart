import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

webpush.setVapidDetails(
  'mailto:admin@eat-smart.app',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  const auth = await getAuthUser(req);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as { title?: string; body?: string };
  const title = body.title ?? 'ЇжРозумно';
  const message = body.body ?? 'Не забудьте записати свій прийом їжі!';

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: auth.userId },
  });

  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const payload = JSON.stringify({ title, body: message });
  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    )
  );

  // Remove expired subscriptions (410 Gone)
  const expired = subscriptions.filter((_, i) => {
    const r = results[i];
    return r.status === 'rejected' && (r.reason as { statusCode?: number })?.statusCode === 410;
  });
  if (expired.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: expired.map((s) => s.endpoint) } },
    });
  }

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  return NextResponse.json({ sent });
}
