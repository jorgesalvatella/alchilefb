'use client';

import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { User, Phone, Car, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';

// NOTE: This is a placeholder. The Driver type should be centralized in @/lib/types.ts
interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  status: 'available' | 'busy' | 'offline';
}

interface DriversTableProps {
  drivers: Driver[];
  onEdit: (driver: Driver) => void;
}

export function DriversTable({ drivers, onEdit }: DriversTableProps) {
  const getStatusBadge = (status: Driver['status']) => {
    const statusConfig = {
      available: { className: 'bg-green-600/20 text-green-400 border-green-500/50', label: 'Disponible' },
      busy: { className: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/50', label: 'Ocupado' },
      offline: { className: 'bg-gray-600/20 text-gray-400 border-gray-500/50', label: 'Offline' },
    };

    const config = statusConfig[status] || statusConfig.offline;

    return (
      <Badge variant="outline" className={`${config.className} font-medium`}>
        {config.label}
      </Badge>
    );
  };

  if (drivers.length === 0) {
    return (
      <div className="bg-black/50 border border-white/10 rounded-2xl p-12 text-center">
        <p className="text-white/60">No se encontraron repartidores.</p>
      </div>
    );
  }

  return (
    <div className="bg-black/50 border border-white/10 rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-700 hover:bg-gray-800/50">
            <TableHead className="text-white/80 font-semibold">Nombre</TableHead>
            <TableHead className="text-white/80 font-semibold">Contacto</TableHead>
            <TableHead className="text-white/80 font-semibold">Vehículo</TableHead>
            <TableHead className="text-white/80 font-semibold">Estado</TableHead>
            <TableHead className="text-white/80 font-semibold text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map((driver) => (
            <TableRow key={driver.id} className="border-gray-800 hover:bg-gray-800/30">
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                    <User className="h-5 w-5 text-orange-400" />
                  </div>
                  <span className="font-medium text-white">{driver.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-white/80">{driver.phone || '-'}</TableCell>
              <TableCell className="text-white/80">{driver.vehicle || '-'}</TableCell>
              <TableCell>{getStatusBadge(driver.status)}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => onEdit(driver)} className="text-white/70 hover:text-orange-400">
                  <Edit className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
