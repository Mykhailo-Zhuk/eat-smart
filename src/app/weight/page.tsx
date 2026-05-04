'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Plus, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface WeightLog {
  id: string;
  weight: number;
  loggedAt: string;
  note?: string;
}

export default function WeightPage() {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ logs: WeightLog[] }>('/api/weight');
      setLogs(data.logs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const addLog = async () => {
    const w = parseFloat(weight);
    if (!w || w < 20 || w > 500) {
      toast({ title: 'Некоректна вага', description: 'Введіть вагу від 20 до 500 кг', variant: 'destructive' });
      return;
    }
    setAdding(true);
    try {
      await apiFetch('/api/weight', { method: 'POST', body: JSON.stringify({ weight: w, note: note || undefined }) });
      setWeight(''); setNote(''); setShowForm(false);
      fetchLogs();
      toast({ title: 'Вагу записано' });
    } catch (e) {
      toast({ title: 'Помилка', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setAdding(false);
    }
  };

  const deleteLog = async (id: string) => {
    try {
      await apiFetch(`/api/weight/${id}`, { method: 'DELETE' });
      setLogs((l) => l.filter((x) => x.id !== id));
    } catch (e) {
      toast({ title: 'Помилка', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const chartData = [...logs].reverse().map((l) => ({
    date: format(new Date(l.loggedAt), 'd MMM', { locale: uk }),
    weight: l.weight,
  }));

  const latest = logs[0];
  const prev = logs[1];
  const diff = latest && prev ? (latest.weight - prev.weight).toFixed(1) : null;

  return (
    <AppLayout>
      <div className="px-4 space-y-4 max-w-lg mx-auto pt-2">
        {/* Summary */}
        {latest && (
          <Card>
            <CardContent className="pt-4 flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold">{latest.weight} кг</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(latest.loggedAt), 'd MMMM yyyy', { locale: uk })}
                </p>
              </div>
              {diff !== null && (
                <div className={`text-right text-lg font-semibold ${parseFloat(diff) > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                  {parseFloat(diff) > 0 ? '+' : ''}{diff} кг
                  <p className="text-xs text-muted-foreground font-normal">від попереднього</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Chart */}
        {chartData.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Динаміка ваги</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip formatter={(v) => [`${v} кг`, 'Вага']} />
                  <Line type="monotone" dataKey="weight" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Add form */}
        {showForm ? (
          <Card>
            <CardContent className="pt-4 space-y-3">
              <div>
                <Label>Вага (кг)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="70.5"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <Label>Нотатка (опційно)</Label>
                <Input
                  placeholder="Нотатка..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Скасувати</Button>
                <Button className="flex-1" onClick={addLog} disabled={adding}>
                  {adding ? 'Збереження...' : 'Зберегти'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button className="w-full h-12 text-base" onClick={() => setShowForm(true)}>
            <Plus className="h-5 w-5 mr-2" /> Додати вагу
          </Button>
        )}

        {/* Log list */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <Card key={l.id} className="rounded-xl">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex-1">
                    <p className="font-semibold">{l.weight} кг</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(l.loggedAt), 'd MMMM yyyy, HH:mm', { locale: uk })}
                    </p>
                    {l.note && <p className="text-xs text-muted-foreground mt-0.5 italic">{l.note}</p>}
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteLog(l.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
