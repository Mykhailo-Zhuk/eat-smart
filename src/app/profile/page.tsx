'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogOut, Download, Bell, BellOff } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/store/auth';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  nick: z.string().min(2, 'Мінімум 2 символи'),
  height: z.string().optional(),
  currentWeight: z.string().optional(),
  targetWeight: z.string().optional(),
  targetDays: z.string().optional(),
  sex: z.string().optional(),
  activityLevel: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Profile {
  id: string; nick: string; email: string;
  height?: number; currentWeight?: number; targetWeight?: number; targetDays?: number;
  sex?: string; activityLevel?: string; dailyCalories?: number;
}

const activityLabels: Record<string, string> = {
  sedentary: 'Сидячий спосіб життя', light: 'Легка активність',
  moderate: 'Помірна активність', high: 'Висока активність', very_high: 'Дуже висока активність',
};

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuth();
  const { permission, subscribed, loading: pushLoading, subscribe, unsubscribe } = usePushNotifications();
  const router = useRouter();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    apiFetch<Profile>('/api/profile').then((p) => {
      setProfile(p);
      reset({
        nick: p.nick ?? '',
        height: p.height != null ? String(p.height) : '',
        currentWeight: p.currentWeight != null ? String(p.currentWeight) : '',
        targetWeight: p.targetWeight != null ? String(p.targetWeight) : '',
        targetDays: p.targetDays != null ? String(p.targetDays) : '',
        sex: p.sex ?? '',
        activityLevel: p.activityLevel ?? '',
      });
    }).catch(() => {});
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { nick: data.nick };
      if (data.height) body.height = Number(data.height);
      if (data.currentWeight) body.currentWeight = Number(data.currentWeight);
      if (data.targetWeight) body.targetWeight = Number(data.targetWeight);
      if (data.targetDays) body.targetDays = Number(data.targetDays);
      if (data.sex) body.sex = data.sex;
      if (data.activityLevel) body.activityLevel = data.activityLevel;

      const updated = await apiFetch<Profile>('/api/profile', { method: 'PATCH', body: JSON.stringify(body) });
      setProfile(updated);
      updateUser({ id: updated.id, nick: updated.nick, email: updated.email });
      toast({ title: 'Профіль оновлено' });
    } catch (e) {
      toast({ title: 'Помилка', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try { await apiFetch('/api/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    logout();
    router.push('/auth/login');
  };

  const handleExport = (format: 'csv' | 'json') => {
    const token = localStorage.getItem('accessToken');
    const url = `/api/export?format=${format}`;
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', `eat-smart-export.${format}`);
    // Use fetch with auth header
    apiFetch<Blob>(url, { headers: { Accept: format === 'csv' ? 'text/csv' : 'application/json' } })
      .then(async () => {
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const blob = await res.blob();
        const burl = URL.createObjectURL(blob);
        a.href = burl;
        a.click();
        URL.revokeObjectURL(burl);
      })
      .catch(() => toast({ title: 'Помилка експорту', variant: 'destructive' }));
  };

  const weightProgress = profile?.currentWeight && profile?.targetWeight
    ? Math.min(100, Math.max(0, Math.round(
        (1 - Math.abs(profile.currentWeight - profile.targetWeight) /
          Math.abs((profile.currentWeight + 10) - profile.targetWeight)) * 100
      )))
    : null;

  return (
    <AppLayout>
      <div className="px-4 space-y-4 max-w-lg mx-auto pt-2">
        {/* User header */}
        <Card>
          <CardContent className="pt-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">{user?.nick ?? '—'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {profile?.dailyCalories && (
                <Badge variant="secondary" className="mt-1">
                  Ціль: {profile.dailyCalories} ккал/день
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>

        {/* Weight progress */}
        {profile?.currentWeight && profile?.targetWeight && (
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Поточна: <strong>{profile.currentWeight} кг</strong></span>
                <span className="text-muted-foreground">Ціль: <strong>{profile.targetWeight} кг</strong></span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${weightProgress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Залишилось: {Math.abs(profile.currentWeight - profile.targetWeight).toFixed(1)} кг
              </p>
            </CardContent>
          </Card>
        )}

        {/* Edit form */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Налаштування профілю</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
              <div>
                <Label>Нік</Label>
                <Input {...register('nick')} />
                {errors.nick && <p className="text-xs text-destructive mt-1">{errors.nick.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Зріст (см)</Label>
                  <Input type="number" placeholder="170" {...register('height')} />
                </div>
                <div>
                  <Label>Поточна вага (кг)</Label>
                  <Input type="number" step="0.1" placeholder="70" {...register('currentWeight')} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Цільова вага (кг)</Label>
                  <Input type="number" step="0.1" placeholder="65" {...register('targetWeight')} />
                </div>
                <div>
                  <Label>Кількість днів</Label>
                  <Input type="number" placeholder="90" {...register('targetDays')} />
                </div>
              </div>
              <div>
                <Label>Стать</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('sex')}>
                  <option value="">Оберіть</option>
                  <option value="male">Чоловіча</option>
                  <option value="female">Жіноча</option>
                </select>
              </div>
              <div>
                <Label>Рівень активності</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('activityLevel')}>
                  <option value="">Оберіть</option>
                  {Object.entries(activityLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <Button type="submit" className="w-full" disabled={saving || !isDirty}>
                {saving ? 'Збереження...' : 'Зберегти зміни'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Push notifications */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Сповіщення</CardTitle></CardHeader>
          <CardContent>
            {permission === 'unsupported' ? (
              <p className="text-sm text-muted-foreground">Ваш браузер не підтримує push-сповіщення</p>
            ) : permission === 'denied' ? (
              <p className="text-sm text-muted-foreground">Сповіщення заблоковано. Увімкніть їх у налаштуваннях браузера.</p>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{subscribed ? 'Сповіщення увімкнено' : 'Сповіщення вимкнено'}</p>
                  <p className="text-xs text-muted-foreground">Нагадування про внесення їжі</p>
                </div>
                <Button
                  variant={subscribed ? 'outline' : 'default'}
                  size="sm"
                  onClick={subscribed ? unsubscribe : subscribe}
                  disabled={pushLoading}
                >
                  {subscribed ? <BellOff className="h-4 w-4 mr-1" /> : <Bell className="h-4 w-4 mr-1" />}
                  {subscribed ? 'Вимкнути' : 'Увімкнути'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Експорт даних</CardTitle></CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => handleExport('csv')}>
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => handleExport('json')}>
              <Download className="h-4 w-4 mr-2" /> JSON
            </Button>
          </CardContent>
        </Card>

        <div className="pb-4" />
      </div>
    </AppLayout>
  );
}
