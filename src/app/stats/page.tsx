'use client';

import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { uk } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { apiFetch } from '@/lib/api';

interface DayStats {
  date: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface StatsResponse {
  type: string;
  dailyCalorieGoal: number;
  totals: { calories: number; protein: number; fat: number; carbs: number };
  days?: DayStats[];
  current?: DayStats;
  previous?: DayStats;
}

function MacroCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="rounded-xl bg-muted p-3 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{Math.round(value)}{unit}</p>
    </div>
  );
}

function StatsView({ type }: { type: 'daily' | 'weekly' | 'monthly' }) {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const date = format(new Date(), 'yyyy-MM-dd');
    apiFetch<StatsResponse>(`/api/stats?type=${type}&date=${date}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [type]);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
    </div>
  );
  if (!data) return <p className="text-center text-muted-foreground py-8">Дані недоступні</p>;

  const days = data.days ?? [];
  const chartData = days.map((d) => ({
    name: format(new Date(d.date), type === 'monthly' ? 'd' : 'EEE', { locale: uk }),
    calories: Math.round(d.calories),
  }));

  return (
    <div className="space-y-4">
      {(type === 'weekly' || type === 'monthly') && chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Калорії по днях</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`${v} ккал`, 'Калорії']} />
                <ReferenceLine y={data.dailyCalorieGoal} stroke="#16a34a" strokeDasharray="4 4" />
                <Bar dataKey="calories" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {type === 'daily' ? 'Сьогодні' : type === 'weekly' ? 'За тиждень' : 'За місяць'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-3xl font-bold text-green-600">{Math.round(data.totals.calories)}</p>
              <p className="text-xs text-muted-foreground">ккал</p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Ціль: {data.dailyCalorieGoal} ккал/день</p>
              {type === 'daily' && data.current && data.previous && (
                <p className={data.current.calories >= data.previous.calories ? 'text-orange-500' : 'text-green-500'}>
                  {data.current.calories >= data.previous.calories ? '▲' : '▼'}{' '}
                  {Math.abs(Math.round(data.current.calories - data.previous.calories))} від вчора
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MacroCard label="Білки" value={data.totals.protein} unit="г" color="text-blue-600" />
            <MacroCard label="Жири" value={data.totals.fat} unit="г" color="text-yellow-600" />
            <MacroCard label="Вуглеводи" value={data.totals.carbs} unit="г" color="text-orange-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function StatsPage() {
  return (
    <AppLayout>
      <div className="px-4 max-w-lg mx-auto pt-2">
        <Tabs defaultValue="daily">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="daily" className="flex-1">День</TabsTrigger>
            <TabsTrigger value="weekly" className="flex-1">Тиждень</TabsTrigger>
            <TabsTrigger value="monthly" className="flex-1">Місяць</TabsTrigger>
          </TabsList>
          <TabsContent value="daily"><StatsView type="daily" /></TabsContent>
          <TabsContent value="weekly"><StatsView type="weekly" /></TabsContent>
          <TabsContent value="monthly"><StatsView type="monthly" /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
