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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/store/auth';

const registerSchema = z.object({
  nick: z.string().min(2, 'Нік має містити щонайменше 2 символи'),
  email: z.string().email('Введіть коректний email'),
  password: z.string().min(8, 'Пароль має містити щонайменше 8 символів'),
  currentWeight: z.string().optional(),
  targetWeight: z.string().optional(),
  height: z.string().optional(),
  sex: z.string().optional(),
  activityLevel: z.string().optional(),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const activityLabels: Record<string, string> = {
  sedentary: 'Сидячий (мало або немає фізичних навантажень)',
  light: 'Легкий (1-3 рази на тиждень)',
  moderate: 'Помірний (3-5 разів на тиждень)',
  high: 'Високий (6-7 разів на тиждень)',
  very_high: 'Дуже високий (двічі на день)',
};

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sex, setSex] = useState<string>('');
  const [activityLevel, setActivityLevel] = useState<string>('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);

    const payload: Record<string, unknown> = {
      nick: data.nick,
      email: data.email,
      password: data.password,
    };

    if (data.currentWeight && data.currentWeight !== '') {
      payload.currentWeight = Number(data.currentWeight);
    }
    if (data.targetWeight && data.targetWeight !== '') {
      payload.targetWeight = Number(data.targetWeight);
    }
    if (data.height && data.height !== '') {
      payload.height = Number(data.height);
    }
    if (sex) payload.sex = sex;
    if (activityLevel) payload.activityLevel = activityLevel;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const json = (await res.json()) as {
        accessToken?: string;
        user?: { id: string; nick: string; email: string };
        error?: string;
      };

      if (!res.ok) {
        setServerError(json.error ?? 'Помилка реєстрації');
        return;
      }

      if (json.accessToken && json.user) {
        login(json.user, json.accessToken);
        router.push('/diary');
      }
    } catch {
      setServerError('Щось пішло не так. Спробуйте ще раз.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥗</div>
          <h1 className="text-2xl font-bold text-foreground">ЇжРозумно</h1>
          <p className="text-muted-foreground text-sm mt-1">Розумний трекер калорій</p>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-xl">Реєстрація</CardTitle>
            <CardDescription>Створіть акаунт щоб розпочати</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Nick */}
              <div className="space-y-1.5">
                <Label htmlFor="nick">Нік *</Label>
                <Input
                  id="nick"
                  placeholder="ваш_нік"
                  autoComplete="username"
                  {...register('nick')}
                />
                {errors.nick && (
                  <p className="text-xs text-destructive">{errors.nick.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
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

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Пароль *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Мінімум 8 символів"
                  autoComplete="new-password"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Додаткова інформація (необов&apos;язково)
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {/* Current Weight */}
                  <div className="space-y-1.5">
                    <Label htmlFor="currentWeight">Поточна вага (кг)</Label>
                    <Input
                      id="currentWeight"
                      type="number"
                      step="0.1"
                      placeholder="70"
                      {...register('currentWeight')}
                    />
                  </div>

                  {/* Target Weight */}
                  <div className="space-y-1.5">
                    <Label htmlFor="targetWeight">Цільова вага (кг)</Label>
                    <Input
                      id="targetWeight"
                      type="number"
                      step="0.1"
                      placeholder="65"
                      {...register('targetWeight')}
                    />
                  </div>

                  {/* Height */}
                  <div className="space-y-1.5">
                    <Label htmlFor="height">Зріст (см)</Label>
                    <Input
                      id="height"
                      type="number"
                      placeholder="170"
                      {...register('height')}
                    />
                  </div>

                  {/* Sex */}
                  <div className="space-y-1.5">
                    <Label>Стать</Label>
                    <Select
                      value={sex}
                      onValueChange={(val) => {
                        setSex(val);
                        setValue('sex', val as 'male' | 'female');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Оберіть" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Чоловіча</SelectItem>
                        <SelectItem value="female">Жіноча</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Activity Level */}
                <div className="space-y-1.5 mt-3">
                  <Label>Рівень активності</Label>
                  <Select
                    value={activityLevel}
                    onValueChange={(val) => {
                      setActivityLevel(val);
                      setValue(
                        'activityLevel',
                        val as 'sedentary' | 'light' | 'moderate' | 'high' | 'very_high'
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть рівень активності" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(activityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                {isSubmitting ? 'Реєстрація...' : 'Зареєструватися'}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              Вже є акаунт?{' '}
              <Link
                href="/auth/login"
                className="text-green-600 font-medium hover:underline"
              >
                Увійти
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
