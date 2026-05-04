'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Apple, BarChart3, Scale, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/diary', label: 'Щоденник', icon: BookOpen },
  { href: '/products', label: 'Продукти', icon: Apple },
  { href: '/stats', label: 'Статистика', icon: BarChart3 },
  { href: '/weight', label: 'Вага', icon: Scale },
  { href: '/profile', label: 'Профіль', icon: User },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <ul className="flex h-full items-center justify-around px-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 h-full rounded-lg transition-colors',
                  active
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-medium leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
