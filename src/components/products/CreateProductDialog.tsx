'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  name: z.string().min(1, "Назва обов'язкова"),
  brand: z.string().optional(),
  caloriesPer100: z.number().min(0).max(900),
  proteinPer100: z.number().min(0).max(100),
  fatPer100: z.number().min(0).max(100),
  carbsPer100: z.number().min(0).max(100),
  servingUnit: z.enum(['g', 'ml', 'pcs']),
  baseServing: z.number().min(1),
  barcode: z.string().optional(),
});

type FormData = {
  name: string; brand?: string; caloriesPer100: number;
  proteinPer100: number; fatPer100: number; carbsPer100: number;
  servingUnit: 'g' | 'ml' | 'pcs'; baseServing: number; barcode?: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const unitLabels: Record<string, string> = { g: 'г', ml: 'мл', pcs: 'шт' };

export function CreateProductDialog({ open, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { servingUnit: 'g', baseServing: 100, proteinPer100: 0, fatPer100: 0, carbsPer100: 0 },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(data) });
      toast({ title: 'Продукт створено', description: data.name });
      reset();
      onCreated();
      onClose();
    } catch (e) {
      toast({ title: 'Помилка', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новий продукт</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Label>Назва *</Label>
            <Input placeholder="Назва продукту" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label>Бренд</Label>
            <Input placeholder="Виробник (опційно)" {...register('brand')} />
          </div>
          <div>
            <Label>Калорії на 100г/мл *</Label>
            <Input type="number" step="0.1" placeholder="250" {...register('caloriesPer100', { valueAsNumber: true })} />
            {errors.caloriesPer100 && <p className="text-xs text-destructive mt-1">{errors.caloriesPer100.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label>Білки (г)</Label>
              <Input type="number" step="0.1" placeholder="0" {...register('proteinPer100', { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Жири (г)</Label>
              <Input type="number" step="0.1" placeholder="0" {...register('fatPer100', { valueAsNumber: true })} />
            </div>
            <div>
              <Label>Вуглеводи (г)</Label>
              <Input type="number" step="0.1" placeholder="0" {...register('carbsPer100', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Одиниця</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" {...register('servingUnit')}>
                {Object.entries(unitLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <Label>Базова порція</Label>
              <Input type="number" placeholder="100" {...register('baseServing', { valueAsNumber: true })} />
            </div>
          </div>
          <div>
            <Label>Штрихкод</Label>
            <Input placeholder="Штрихкод (опційно)" {...register('barcode')} />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Скасувати</Button>
            <Button type="submit" className="flex-1" disabled={loading}>{loading ? 'Збереження...' : 'Створити'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
