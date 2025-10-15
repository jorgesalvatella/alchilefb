'use client';

import { Search, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { OrderStatus } from '@/lib/types';

interface OrderStatusFilter {
  value: 'all' | OrderStatus;
  label: string;
  count?: number;
}

interface OrdersFiltersProps {
  selectedStatus: 'all' | OrderStatus;
  onStatusChange: (status: 'all' | OrderStatus) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  dateFilter: 'today' | 'week' | 'month' | 'custom';
  onDateFilterChange: (filter: 'today' | 'week' | 'month' | 'custom') => void;
  statusCounts?: {
    all?: number;
    'Pedido Realizado'?: number;
    'Preparando'?: number;
    'En Reparto'?: number;
    'Entregado'?: number;
    'Cancelado'?: number;
  };
}

export function OrdersFilters({
  selectedStatus,
  onStatusChange,
  searchTerm,
  onSearchChange,
  dateFilter,
  onDateFilterChange,
  statusCounts = {},
}: OrdersFiltersProps) {
  const statusFilters: OrderStatusFilter[] = [
    { value: 'all', label: 'Todos', count: statusCounts.all },
    { value: 'Pedido Realizado', label: 'Recibido', count: statusCounts['Pedido Realizado'] },
    { value: 'Preparando', label: 'Preparando', count: statusCounts['Preparando'] },
    { value: 'En Reparto', label: 'En Reparto', count: statusCounts['En Reparto'] },
    { value: 'Entregado', label: 'Entregado', count: statusCounts['Entregado'] },
    { value: 'Cancelado', label: 'Cancelado', count: statusCounts['Cancelado'] },
  ];

  const getStatusColor = (status: 'all' | OrderStatus) => {
    switch (status) {
      case 'all':
        return 'bg-gray-700 hover:bg-gray-600 text-white';
      case 'Pedido Realizado':
        return 'bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border-yellow-500/50';
      case 'Preparando':
        return 'bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border-orange-500/50';
      case 'En Reparto':
        return 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border-blue-500/50';
      case 'Entregado':
        return 'bg-green-600/20 hover:bg-green-600/30 text-green-400 border-green-500/50';
      case 'Cancelado':
        return 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border-red-500/50';
      default:
        return 'bg-gray-700 hover:bg-gray-600 text-white';
    }
  };

  const getSelectedStatusColor = (status: 'all' | OrderStatus) => {
    switch (status) {
      case 'all':
        return 'bg-gray-600 text-white border-gray-500';
      case 'Pedido Realizado':
        return 'bg-yellow-600/40 text-yellow-300 border-yellow-400';
      case 'Preparando':
        return 'bg-orange-600/40 text-orange-300 border-orange-400';
      case 'En Reparto':
        return 'bg-blue-600/40 text-blue-300 border-blue-400';
      case 'Entregado':
        return 'bg-green-600/40 text-green-300 border-green-400';
      case 'Cancelado':
        return 'bg-red-600/40 text-red-300 border-red-400';
      default:
        return 'bg-gray-600 text-white border-gray-500';
    }
  };

  return (
    <div className="space-y-6 mb-8" data-testid="orders-filters-container">
      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-3">
        {statusFilters.map((filter) => {
          const isSelected = selectedStatus === filter.value;
          const baseColor = isSelected
            ? getSelectedStatusColor(filter.value)
            : getStatusColor(filter.value);

          return (
            <button
              key={filter.value}
              onClick={() => onStatusChange(filter.value)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                border ${baseColor}
                ${isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-current' : ''}
                hover:scale-105 active:scale-95
              `}
            >
              <span className="flex items-center gap-2">
                {filter.label}
                {filter.count !== undefined && (
                  <Badge
                    variant="secondary"
                    className="ml-1 bg-black/30 text-white border-0"
                  >
                    {filter.count}
                  </Badge>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Date Filter Row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          <Input
            type="text"
            placeholder="Buscar por ID, cliente o dirección..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="
              pl-10 pr-4 py-2 w-full
              bg-gray-900/50 border-gray-700 text-white placeholder:text-white/40
              focus:border-orange-500 focus:ring-orange-500/20
              transition-colors
            "
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 md:w-64">
          <Calendar className="h-5 w-5 text-white/60" />
          <Select value={dateFilter} onValueChange={onDateFilterChange}>
            <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white focus:border-orange-500 focus:ring-orange-500/20">
              <SelectValue placeholder="Filtrar por fecha" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700">
              <SelectItem
                value="today"
                className="text-white focus:bg-gray-800 focus:text-white"
              >
                Hoy
              </SelectItem>
              <SelectItem
                value="week"
                className="text-white focus:bg-gray-800 focus:text-white"
              >
                Última Semana
              </SelectItem>
              <SelectItem
                value="month"
                className="text-white focus:bg-gray-800 focus:text-white"
              >
                Este Mes
              </SelectItem>
              <SelectItem
                value="custom"
                className="text-white focus:bg-gray-800 focus:text-white"
              >
                Rango Personalizado
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
