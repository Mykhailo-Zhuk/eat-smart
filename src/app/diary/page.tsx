'use client';

import { useState, useEffect, useCallback } from 'react';
import { format, addDays, subDays, isToday } from 'date-fns';
import { uk } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AddFoodDialog } from '@/components/diary/AddFoodDialog';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface FoodEntry {
  id: string;
  productId: string;
  product: { name: string; brand?: string };
  amount: number;
  servingUnit: string;
  mealCategory?: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

interface DiaryDay {
  entries: FoodEntry[];
  grouped: Record<string, FoodEntry[]>;
  totals: { calories: number; protein: number; fat: number; carbs: number };
  dailyCalorieGoal?: number;
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Сніданок',
  lunch: 'Обід',
  dinner: 'Вечеря',
  snack: 'Перекус',
  uncategorized: 'Інше',
};

const UNIT_LABELS: Record<string, string> = { g: 'г', ml: 'мл', pcs: 'шт' };

export default function DiaryPage() {
  const [date, setDate] = useState(new Date());
  const [diary, setDiary] = useState<DiaryDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const { toast } = useToast();

  const dateStr = format(date, 'yyyy-MM-dd');

  const fetchDiary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<DiaryDay>(`/api/diary?date=${dateStr}`);
      setDiary(data);
    } catch {
      setDiary(null);
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => { fetchDiary(); }, [fetchDiary]);

  const deleteEntry = async (id: string) => {
    try {
      await apiFetch(`/api/diary/${id}`, { method: 'DELETE' });
      fetchDiary();
    } catch (e) {
      toast({ title: 'Помилка', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const goal = diary?.dailyCalorieGoal ?? 2000;
  const consumed = diary?.totals.calories ?? 0;
  const percent = Math.min(100, Math.round((consumed / goal) * 100));
  const groups = diary?.grouped ?? {};
  const groupKeys = Object.keys(groups).sort();

  const dateLabel = isToday(date)
    ? 'Сьогодні'
    : format(date, 'd MMMM yyyy', { locale: uk });

  return (
    <AppLayout>
      <div className="px-4 space-y-4 max-w-lg mx-auto">
        {/* Date nav */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="icon" onClick={() => setDate(subDays(date, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="font-semibold">{dateLabel}</p>
            {!isToday(date) && (
              <button onClick={() => setDate(new Date())} className="text-xs text-green-600 hover:underline">
                Сьогодні
              </button>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setDate(addDays(date, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Summary card */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{consumed}</p>
                <p className="text-xs text-muted-foreground">з {goal} ккал</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Залишилось</p>
                <p className="text-lg font-semibold text-foreground">{Math.max(0, goal - consumed)} ккал</p>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all ${percent >= 100 ? 'bg-destructive' : 'bg-green-500'}`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Білки', value: diary?.totals.protein ?? 0, unit: 'г' },
                { label: 'Жири', value: diary?.totals.fat ?? 0, unit: 'г' },
                { label: 'Вуглеводи', value: diary?.totals.carbs ?? 0, unit: 'г' },
              ].map(({ label, value, unit }) => (
                <div key={label} className="rounded-lg bg-muted p-2">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold text-sm">{Math.round(value)}{unit}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Entries */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
          </div>
        ) : groupKeys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-4xl mb-2">🍽️</p>
            <p>Записів немає. Додайте перший прийом їжі!</p>
          </div>
        ) : (
          groupKeys.map((key) => (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{MEAL_LABELS[key] ?? key}</Badge>
                <span className="text-xs text-muted-foreground">
                  {Math.round(groups[key].reduce((s, e) => s + e.calories, 0))} ккал
                </span>
              </div>
              <div className="space-y-2">
                {groups[key].map((entry) => (
                  <Card key={entry.id} className="rounded-xl">
                    <CardContent className="flex items-center gap-3 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{entry.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.amount} {UNIT_LABELS[entry.servingUnit] ?? entry.servingUnit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-600">{Math.round(entry.calories)} ккал</p>
                        <p className="text-xs text-muted-foreground">
                          Б:{Math.round(entry.protein)} Ж:{Math.round(entry.fat)} В:{Math.round(entry.carbs)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteEntry(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Add button */}
        <div className="pb-4">
          <Button className="w-full h-12 text-base" onClick={() => setAddOpen(true)}>
            <Plus className="h-5 w-5 mr-2" />
            Додати їжу
          </Button>
        </div>
      </div>

      <AddFoodDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        date={dateStr}
        onAdded={fetchDiary}
      />
    </AppLayout>
  );
}
