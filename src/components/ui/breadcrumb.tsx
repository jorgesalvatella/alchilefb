'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type BreadcrumbItem = {
  label: string;
  href: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav 
      aria-label="Breadcrumb" 
      className="mb-8 bg-black/20 backdrop-blur-sm border border-white/10 rounded-full inline-flex items-center p-2"
    >
      <ol className="flex items-center space-x-2 text-sm">
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
