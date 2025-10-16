'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { useUser } from '@/firebase/provider';
import { toast } from 'sonner';
import { Order } from '@/lib/types';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';

// Mock data for drivers as the endpoint doesn't exist yet
const mockDrivers = [
  { id: 'driver-001', name: 'Juan Pérez', status: 'available' },
  { id: 'driver-002', name: 'Maria García', status: 'available' },
  { id: 'driver-003', name: 'Pedro Pascal', status: 'busy' },
  { id: 'driver-004', name: 'Ana de Armas', status: 'available' },
];

interface Driver {
  id: string;
  name: string;
  status: 'available' | 'busy' | 'offline';
}

interface AssignDriverDialogProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const getStatusBadge = (status: Driver['status']) => {
  const statusConfig = {
    available: { className: 'bg-green-600/20 text-green-400', label: 'Disponible' },
    busy: { className: 'bg-yellow-600/20 text-yellow-400', label: 'Ocupado' },
    offline: { className: 'bg-gray-600/20 text-gray-400', label: 'Offline' },
  };
  const config = statusConfig[status] || statusConfig.offline;
  return <Badge className={cn('ml-auto text-xs', config.className)}>{config.label}</Badge>;
};

export function AssignDriverDialog({ order, isOpen, onClose, onSuccess }: AssignDriverDialogProps) {
  const { user } = useUser();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      const fetchDrivers = async () => {
        setIsFetching(true);
        try {
          const token = await user.getIdToken();
          const response = await fetch(`/api/control/drivers`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            throw new Error('Error al cargar repartidores');
          }
          const data = await response.json();
          setDrivers(data);
        } catch (error) {
          console.error("Failed to fetch drivers", error);
          toast.error("No se pudieron cargar los repartidores.");
        } finally {
          setIsFetching(false);
        }
      };
      fetchDrivers();
    } else {
      // Reset state on close
      setSelectedDriver(null);
      setDrivers([]);
    }
  }, [isOpen, user]);

  const handleAssign = async () => {
    if (!user || !order || !selectedDriver) return;

    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/pedidos/control/${order.id}/asignar-repartidor`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverId: selectedDriver.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al asignar repartidor');
      }

      toast.success(`Repartidor ${selectedDriver.name} asignado exitosamente.`);
      onSuccess(); // This will trigger a refresh in the parent component
      onClose();
    } catch (error) {
      console.error('Error assigning driver:', error);
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle>Asignar Repartidor al Pedido #{order?.id?.slice(-6).toUpperCase()}</DialogTitle>
          <DialogDescription>
            Selecciona un repartidor disponible de la lista.
          </DialogDescription>
        </DialogHeader>
        
        <Command className="rounded-lg border border-gray-700 bg-gray-800">
          <CommandInput placeholder="Buscar repartidor..." />
          <CommandEmpty>{isFetching ? 'Cargando repartidores...' : 'No se encontraron repartidores disponibles.'}</CommandEmpty>
          <CommandGroup>
            {drivers.map((driver) => (
              <CommandItem
                key={driver.id}
                value={driver.name}
                onSelect={() => {
                  setSelectedDriver(driver);
                }}
                className="text-white focus:bg-gray-700 flex justify-between items-center"
              >
                <div className="flex items-center">
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedDriver?.id === driver.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {driver.name}
                </div>
                {getStatusBadge(driver.status)}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-white hover:bg-gray-800">Cancelar</Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedDriver || isLoading}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {isLoading ? 'Asignando...' : 'Confirmar Asignación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
