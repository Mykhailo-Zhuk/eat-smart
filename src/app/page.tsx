'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      router.replace('/diary');
    } else {
      router.replace('/auth/login');
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="text-4xl mb-4">🥗</div>
        <p className="text-muted-foreground text-sm">Завантаження...</p>
      </div>
    </div>
  );
}
