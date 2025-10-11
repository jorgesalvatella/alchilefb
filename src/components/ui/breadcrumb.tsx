'use client';

import Link from 'next/link';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

type BreadcrumbItem = {
  label: string;
  href: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const allButLastTwo = items.slice(0, -2);
  const lastTwo = items.slice(-2);

  return (
    <nav 
      aria-label="Breadcrumb" 
      className="mb-8 bg-black/20 backdrop-blur-sm border border-white/10 rounded-full inline-flex items-center p-2"
    >
      {/* --- Mobile View (< md) --- */}
      <ol className="flex items-center space-x-2 text-sm md:hidden">
        {items.length > 2 && (
          <li className="flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-white/60 hover:bg-white/10 hover:text-orange-400">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black/80 border-white/20 text-white">
                {allButLastTwo.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ChevronRight className="h-4 w-4 text-white/40 mx-2" />
          </li>
        )}
        {(items.length <= 2 ? items : lastTwo).map((item, index, arr) => (
          <li key={item.href} className="flex items-center">
            <Link
              href={item.href}
              className={`px-3 py-1 rounded-full transition-colors ${
                index === arr.length - 1
                  ? 'font-semibold text-white bg-white/10'
                  : 'text-white/60 hover:text-orange-400 hover:bg-white/5'
              }`}
              aria-current={index === arr.length - 1 ? 'page' : undefined}
            >
              {item.label}
            </Link>
            {index < arr.length - 1 && <ChevronRight className="h-4 w-4 text-white/40 mx-2" />}
          </li>
        ))}
      </ol>

      {/* --- Desktop View (>= md) --- */}
      <ol className="hidden md:flex items-center space-x-2 text-sm">
        {items.map((item, index) => (
          <li key={item.href} className="flex items-center">
            <Link
              href={item.href}
              className={`px-3 py-1 rounded-full transition-colors ${
                index === items.length - 1
                  ? 'font-semibold text-white bg-white/10'
                  : 'text-white/60 hover:text-orange-400 hover:bg-white/5'
              }`}
              aria-current={index === items.length - 1 ? 'page' : undefined}
            >
              {item.label}
            </Link>
            {index < items.length - 1 && <ChevronRight className="h-4 w-4 text-white/40 mx-2" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
