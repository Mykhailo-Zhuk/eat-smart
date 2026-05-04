'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { useTheme } from './ThemeProvider';
import { Navigation } from './Navigation';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { accessToken, isLoading } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !accessToken) {
      router.replace('/auth/login');
    }
  }, [accessToken, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
      </div>
    );
  }

  if (!accessToken) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur">
        <span className="text-lg font-bold text-green-600 dark:text-green-400">ЇжРозумно 🥗</span>
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition-colors"
          aria-label="Перемкнути тему"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>
      </header>
      <main className="pb-20 pt-2">{children}</main>
      <Navigation />
    </div>
  );
}
