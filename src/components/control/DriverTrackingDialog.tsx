'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, MapPin, Navigation, User, Phone, Package, Clock } from 'lucide-react';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/firebase/config';

const libraries: ('places')[] = ['places'];

interface DriverTrackingDialogProps {
  driverId: string | null;
  driverName: string;
  isOpen: boolean;
  onClose: () => void;
}

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '12px',
};

const defaultCenter = {
  lat: 20.6296,
  lng: -87.0739,
};

export function DriverTrackingDialog({
  driverId,
  driverName,
  isOpen,
  onClose,
}: DriverTrackingDialogProps) {
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [isTrackingActive, setIsTrackingActive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  // Suscribirse a la ubicación del repartidor en tiempo real
  useEffect(() => {
    if (!driverId || !isOpen) {
      setDriverLocation(null);
      setActiveOrder(null);
      setIsTrackingActive(false);
      return;
    }

    const driverRef = doc(db, 'repartidores', driverId);

    const unsubscribeDriver = onSnapshot(driverRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        if (data.currentLocation) {
          const location = {
            lat: data.currentLocation.lat,
            lng: data.currentLocation.lng,
          };
          setDriverLocation(location);
          setMapCenter(location); // Centrar mapa en el repartidor
          setIsTrackingActive(data.isTrackingActive || false);

          if (data.currentLocation.timestamp) {
            setLastUpdate(
              data.currentLocation.timestamp.toDate
                ? data.currentLocation.timestamp.toDate()
                : new Date(data.currentLocation.timestamp)
            );
          }
        } else {
          setDriverLocation(null);
          setIsTrackingActive(false);
        }
      }
    });

    // Suscribirse al pedido activo del repartidor
    const ordersRef = collection(db, 'pedidos');
    const activeOrderQuery = query(
      ordersRef,
      where('driverId', '==', driverId),
      where('status', 'in', ['Preparando', 'En Reparto'])
    );

    const unsubscribeOrders = onSnapshot(activeOrderQuery, (snapshot) => {
      if (!snapshot.empty) {
        const orderDoc = snapshot.docs[0];
        setActiveOrder({ id: orderDoc.id, ...orderDoc.data() });
      } else {
        setActiveOrder(null);
      }
    });

    return () => {
      unsubscribeDriver();
      unsubscribeOrders();
    };
  }, [driverId, isOpen]);

  if (loadError) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>Error al cargar mapa</DialogTitle>
          </DialogHeader>
          <div className="p-4 bg-red-50 border-red-200 rounded">
            <p className="text-sm text-red-600">No se pudo cargar Google Maps</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getCustomerLocation = () => {
    if (!activeOrder?.shippingAddress) return null;

    const addr = activeOrder.shippingAddress;

    // Si tiene coordenadas directas
    if (addr.coordinates) {
      return { lat: addr.coordinates.lat, lng: addr.coordinates.lng };
    }

    return null;
  };

  const customerLocation = getCustomerLocation();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl bg-gray-900 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Navigation className="w-6 h-6 text-blue-500" />
            Tracking en Vivo - {driverName}
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Seguimiento en tiempo real de la ubicación del repartidor
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tracking Status */}
            <Card className="p-4 bg-gray-800 border-gray-700">
              <div className="flex items-center gap-3">
                {isTrackingActive ? (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <div>
                      <p className="text-sm text-white/60">Estado</p>
                      <p className="font-semibold text-green-400">Tracking Activo</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-gray-500 rounded-full" />
                    <div>
                      <p className="text-sm text-white/60">Estado</p>
                      <p className="font-semibold text-gray-400">Sin tracking</p>
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* Last Update */}
            <Card className="p-4 bg-gray-800 border-gray-700">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-sm text-white/60">Última actualización</p>
                  <p className="font-semibold text-white">
                    {lastUpdate
                      ? lastUpdate.toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Active Order */}
            <Card className="p-4 bg-gray-800 border-gray-700">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-orange-400" />
                <div>
                  <p className="text-sm text-white/60">Pedido activo</p>
                  <p className="font-semibold text-white">
                    {activeOrder ? `#${activeOrder.id.slice(-6).toUpperCase()}` : 'Ninguno'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Map */}
          {!isLoaded ? (
            <Card className="p-12 flex items-center justify-center bg-gray-800 border-gray-700">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
              <span className="ml-3 text-white/60">Cargando mapa...</span>
            </Card>
          ) : (
            <Card className="overflow-hidden bg-gray-800 border-gray-700">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={14}
                options={{
                  zoomControl: true,
                  streetViewControl: false,
                  mapTypeControl: true,
                  fullscreenControl: true,
                  styles: [
                    {
                      featureType: 'all',
                      elementType: 'geometry',
                      stylers: [{ color: '#242f3e' }],
                    },
                    {
                      featureType: 'all',
                      elementType: 'labels.text.stroke',
                      stylers: [{ color: '#242f3e' }],
                    },
                    {
                      featureType: 'all',
                      elementType: 'labels.text.fill',
                      stylers: [{ color: '#746855' }],
                    },
                  ],
                }}
              >
                {/* Driver Location Marker (Blue) */}
                {driverLocation && (
                  <Marker
                    position={driverLocation}
                    icon={{
                      url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png',
                      scaledSize: new window.google.maps.Size(50, 50),
                    }}
                    title={`${driverName} (Repartidor)`}
                    animation={window.google.maps.Animation.DROP}
                  />
                )}

                {/* Customer Location Marker (Red) */}
                {customerLocation && (
                  <Marker
                    position={customerLocation}
                    icon={{
                      url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                      scaledSize: new window.google.maps.Size(50, 50),
                    }}
                    title="Cliente"
                  />
                )}
              </GoogleMap>

              {/* Map Legend */}
              <div className="p-4 bg-gray-800/95 border-t border-gray-700">
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full" />
                    <span className="text-sm text-white/80">Repartidor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full" />
                    <span className="text-sm text-white/80">Cliente</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Active Order Details */}
          {activeOrder && (
            <Card className="p-6 bg-gray-800 border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-orange-400" />
                Detalles del Pedido Activo
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div>
                  <h4 className="text-sm font-medium text-white/60 mb-3">Información del Cliente</h4>
                  <div className="space-y-2">
                    {activeOrder.userName && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-white/40" />
                        <span className="text-white/80">{activeOrder.userName}</span>
                      </div>
                    )}
                    {activeOrder.userPhone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-white/40" />
                        <span className="text-white/80">{activeOrder.userPhone}</span>
                      </div>
                    )}
                    {activeOrder.shippingAddress && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-white/40 mt-0.5" />
                        <span className="text-white/80">
                          {typeof activeOrder.shippingAddress === 'string'
                            ? activeOrder.shippingAddress
                            : `${activeOrder.shippingAddress.street}, ${activeOrder.shippingAddress.city}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Info */}
                <div>
                  <h4 className="text-sm font-medium text-white/60 mb-3">Estado del Pedido</h4>
                  <div className="space-y-3">
                    <div>
                      <Badge
                        className={
                          activeOrder.status === 'En Reparto'
                            ? 'bg-green-600/20 text-green-400 border-green-500/50'
                            : 'bg-orange-600/20 text-orange-400 border-orange-500/50'
                        }
                      >
                        {activeOrder.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-white/80">
                      <span className="text-white/60">Total:</span>{' '}
                      <span className="font-semibold">
                        ${(activeOrder.totalVerified || activeOrder.total || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-sm text-white/80">
                      <span className="text-white/60">Método de pago:</span>{' '}
                      <span className="font-semibold">{activeOrder.paymentMethod || 'N/A'}</span>
                    </div>
                    <div className="text-sm text-white/80">
                      <span className="text-white/60">Items:</span>{' '}
                      <span className="font-semibold">{activeOrder.items?.length || 0} productos</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* No Active Tracking Message */}
          {!driverLocation && !isTrackingActive && (
            <Card className="p-8 bg-yellow-900/20 border-yellow-600/30 text-center">
              <div className="flex flex-col items-center gap-3">
                <MapPin className="w-12 h-12 text-yellow-500" />
                <div>
                  <p className="text-lg font-semibold text-yellow-400 mb-1">
                    Tracking no disponible
                  </p>
                  <p className="text-sm text-white/60">
                    El repartidor no tiene un pedido activo o el tracking GPS no está activado
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
