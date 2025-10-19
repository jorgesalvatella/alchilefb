'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DriversTable } from '@/components/control/DriversTable';
import { AddEditDriverDialog } from '@/components/control/AddEditDriverDialog';
import { DriverTrackingDialog } from '@/components/control/DriverTrackingDialog';
import { withAuth, WithAuthProps } from '@/firebase/withAuth';

// NOTE: This should be a shared type
interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  status: 'available' | 'busy' | 'offline';
}

function RepartidoresPage({ user }: WithAuthProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false);
  const [trackedDriver, setTrackedDriver] = useState<Driver | null>(null);

  const fetchDrivers = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/control/drivers', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch drivers');
      }
      const data = await response.json();
      setDrivers(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar los repartidores.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchDrivers();
    }
  }, [user, fetchDrivers]);

  const handleAddClick = () => {
    setSelectedDriver(null);
    setIsDialogOpen(true);
  };

  const handleEditClick = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    fetchDrivers(); // Refresh the list after a successful add/edit
  };

  const handleTrackClick = (driver: Driver) => {
    setTrackedDriver(driver);
    setIsTrackingDialogOpen(true);
  };

  return (
    <>
      <div className="pt-32">
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-8xl font-black text-white mb-6">
            <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
              Gestión de Repartidores
            </span>
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Añade, edita y gestiona los repartidores del servicio.
          </p>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="flex justify-end mb-6">
            <Button onClick={handleAddClick} className="bg-orange-500 hover:bg-orange-600">
              <PlusCircle className="h-4 w-4 mr-2" />
              Añadir Repartidor
            </Button>
          </div>

          {isLoading ? (
            <div className="bg-black/50 border border-white/10 rounded-2xl p-12 text-center">
              <p className="text-white/60">Cargando repartidores...</p>
            </div>
          ) : (
            <DriversTable
              drivers={drivers}
              onEdit={handleEditClick}
              onTrack={handleTrackClick}
            />
          )}
        </div>
      </div>
      <AddEditDriverDialog
        driver={selectedDriver}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSuccess={handleDialogSuccess}
      />
      <DriverTrackingDialog
        driverId={trackedDriver?.id || null}
        driverName={trackedDriver?.name || ''}
        isOpen={isTrackingDialogOpen}
        onClose={() => setIsTrackingDialogOpen(false)}
      />
    </>
  );
}

export default withAuth(RepartidoresPage, 'admin');