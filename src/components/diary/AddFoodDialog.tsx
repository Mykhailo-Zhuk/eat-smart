'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  brand: string | null;
  caloriesPer100: number;
  proteinPer100: number;
  fatPer100: number;
  carbsPer100: number;
  servingUnit: string;
  baseServing: number;
}

interface AddFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  onAdded: () => void;
}

const addFoodSchema = z.object({
  amount: z.number().positive('Кількість має бути більше 0'),
  mealCategory: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
});

type AddFoodFormData = { amount: number; mealCategory: 'breakfast' | 'lunch' | 'dinner' | 'snack' };

const mealLabels: Record<string, string> = {
  breakfast: 'Сніданок',
  lunch: 'Обід',
  dinner: 'Вечеря',
  snack: 'Перекус',
};

export function AddFoodDialog({ open, onOpenChange, date, onAdded }: AddFoodDialogProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mealCategory, setMealCategory] = useState<string>('breakfast');
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddFoodFormData>({
    resolver: zodResolver(addFoodSchema),
    defaultValues: {
      amount: 100,
      mealCategory: 'breakfast',
    },
  });

  const searchProducts = useCallback(async (q: string) => {
    setIsSearching(true);
    try {
      const data = await apiFetch<{ products: Product[] }>(
        `/api/products?search=${encodeURIComponent(q)}`
      );
      setProducts(data.products);
    } catch {
      setProducts([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.trim().length === 0) {
      searchProducts('');
      return;
    }
    searchTimeout.current = setTimeout(() => {
      searchProducts(query);
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query, searchProducts]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedProduct(null);
      reset({ amount: 100, mealCategory: 'breakfast' });
      setMealCategory('breakfast');
      searchProducts('');
    }
  }, [open, reset, searchProducts]);

  const onSubmit = async (data: AddFoodFormData) => {
    if (!selectedProduct) return;
    try {
      await apiFetch('/api/diary', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProduct.id,
          date,
          amount: data.amount,
          servingUnit: selectedProduct.servingUnit,
          mealCategory,
        }),
      });
      toast({ title: 'Їжу додано', variant: 'default' });
      onAdded();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Помилка додавання';
      toast({ title: 'Помилка', description: message, variant: 'destructive' });
    }
  };

  const estimatedCalories =
    selectedProduct
      ? Math.round(
          (selectedProduct.caloriesPer100 *
            (parseFloat(String((document.getElementById('amount') as HTMLInputElement)?.value || '100')) || 100)) /
            100
        )
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Додати їжу</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          {!selectedProduct && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Пошук продуктів..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {isSearching && (
                  <div className="flex items-center justify-center py-8">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
                  </div>
                )}
                {!isSearching && products.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Продукти не знайдено
                  </p>
                )}
                {!isSearching &&
                  products.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="w-full px-4 py-3 text-left hover:bg-muted transition-colors"
                    >
                      <div className="font-medium text-sm text-foreground">{product.name}</div>
                      {product.brand && (
                        <div className="text-xs text-muted-foreground">{product.brand}</div>
                      )}
                      <div className="text-xs text-green-600 mt-0.5">
                        {product.caloriesPer100} ккал / 100{product.servingUnit}
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Selected product form */}
          {selectedProduct && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{selectedProduct.name}</p>
                    {selectedProduct.brand && (
                      <p className="text-xs text-muted-foreground">{selectedProduct.brand}</p>
                    )}
                    <p className="text-xs text-green-600 mt-1">
                      {selectedProduct.caloriesPer100} ккал / 100{selectedProduct.servingUnit}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    змінити
                  </button>
                </div>
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span>Б: {selectedProduct.proteinPer100}г</span>
                  <span>Ж: {selectedProduct.fatPer100}г</span>
                  <span>В: {selectedProduct.carbsPer100}г</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">
                    Кількість ({selectedProduct.servingUnit})
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.1"
                    min="0.1"
                    {...register('amount', { valueAsNumber: true })}
                  />
                  {errors.amount && (
                    <p className="text-xs text-destructive">{errors.amount.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Прийом їжі</Label>
                  <Select
                    value={mealCategory}
                    onValueChange={setMealCategory}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(mealLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  Скасувати
                </Button>
                <Button type="submit" className="flex-1 h-12" disabled={isSubmitting}>
                  <Plus className="h-4 w-4 mr-1" />
                  {isSubmitting ? 'Додавання...' : 'Додати'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
