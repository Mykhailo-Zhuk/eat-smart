'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Star, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateProductDialog } from '@/components/products/CreateProductDialog';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  brand?: string;
  caloriesPer100: number;
  proteinPer100: number;
  fatPer100: number;
  carbsPer100: number;
  servingUnit: string;
  baseServing: number;
  isFavorite: boolean;
  source: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const data = await apiFetch<{ products: Product[] }>(`/api/products${params}`);
      setProducts(data.products);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchProducts, 300);
    return () => clearTimeout(t);
  }, [fetchProducts]);

  const deleteProduct = async (id: string) => {
    try {
      await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
      setProducts((p) => p.filter((x) => x.id !== id));
      toast({ title: 'Видалено' });
    } catch (e) {
      toast({ title: 'Помилка', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const unitLabel: Record<string, string> = { g: 'г', ml: 'мл', pcs: 'шт' };

  return (
    <AppLayout>
      <div className="px-4 space-y-4 max-w-lg mx-auto pt-2">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Пошук продуктів..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="h-10 px-3">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">🥦</p>
            <p className="font-medium">Продуктів не знайдено</p>
            <p className="text-sm mt-1">Створіть перший продукт</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <Card key={p.id} className="rounded-xl">
                <CardContent className="flex items-center gap-3 py-3">
                  {p.isFavorite && <Star className="h-4 w-4 text-yellow-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    {p.brand && <p className="text-xs text-muted-foreground">{p.brand}</p>}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Б:{p.proteinPer100}г · Ж:{p.fatPer100}г · В:{p.carbsPer100}г
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-green-600">{p.caloriesPer100} ккал</p>
                    <p className="text-xs text-muted-foreground">100 {unitLabel[p.servingUnit] ?? p.servingUnit}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => deleteProduct(p.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateProductDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchProducts}
      />
    </AppLayout>
  );
}
