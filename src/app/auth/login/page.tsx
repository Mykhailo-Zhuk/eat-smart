'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/store/auth';
import { ApiException } from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Введіть коректний email'),
  password: z.string().min(1, 'Введіть пароль'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const json = (await res.json()) as {
        accessToken?: string;
        user?: { id: string; nick: string; email: string };
        error?: string;
      };

      if (!res.ok) {
        setServerError(json.error ?? 'Помилка входу');
        return;
      }

      if (json.accessToken && json.user) {
        login(json.user, json.accessToken);
        router.push('/diary');
      }
    } catch (err) {
      if (err instanceof ApiException) {
        setServerError(err.message);
      } else {
        setServerError('Щось пішло не так. Спробуйте ще раз.');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥗</div>
          <h1 className="text-2xl font-bold text-foreground">ЇжРозумно</h1>
          <p className="text-muted-foreground text-sm mt-1">Розумний трекер калорій</p>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Вхід</CardTitle>
            <CardDescription>Введіть свої дані для входу в акаунт</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              {serverError && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-sm text-destructive">{serverError}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Вхід...' : 'Увійти'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Немає акаунту?{' '}
              <Link
                href="/auth/register"
                className="text-green-600 font-medium hover:underline"
              >
                Зареєструватися
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
