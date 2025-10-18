// This file contains shared type definitions for the application.

export type SaleProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  isFeatured?: boolean; // Para marcar productos como destacados en la página de inicio
  
  // Financials
  cost?: number;
  platformFeePercent?: number;
  isTaxable: boolean;
  basePrice: number;

  // Cataloging
  businessUnitId: string;
  departmentId: string;
  categoriaVentaId: string;

  // Customization Fields
  ingredientesBase?: string[];
  ingredientesExtra?: {
    nombre: string;
    precio: number;
  }[];

  // Timestamps
  createdAt: any; // Consider using Timestamp from 'firebase/firestore'
  updatedAt: any;
  deletedAt: any | null;
};

export type CartItem = {
  id: string;
  name: string;
  price: number; // Base price of the product
  quantity: number;
  imageUrl?: string;
  customizations?: {
    added: { nombre: string; precio: number }[];
    removed: string[];
  };
  // Campos para paquetes
  isPackage?: boolean;
  packageItems?: Array<{
    productId: string;
    name: string;
    quantity: number;
  }>;
};

// Tipos para la dirección de entrega
export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  name: string; // Nombre de quien recibe
}

// Tipos para el documento de Pedido en Firestore
export type OrderStatus =
  | 'Pedido Realizado' // Estado inicial
  | 'Preparando'       // En cocina
  | 'En Reparto'       // Con repartidor
  | 'Entregado'        // Completado
  | 'Cancelado';       // Cancelado por admin o cliente

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: any; // Firestore Timestamp
  changedBy?: string; // UID del admin que hizo el cambio
}

export interface Order {
  id?: string; // ID del documento (opcional al crear)
  userId: string;
  items: CartItem[];
  subtotalVerified: number;
  taxVerified: number;
  totalVerified: number;
  paymentMethod: 'Efectivo' | 'Tarjeta a la entrega' | 'Transferencia bancaria';
  status: OrderStatus;
  createdAt: any; // Debería ser un Timestamp de Firestore, pero 'any' es más simple en cliente
  shippingAddress: Address | 'whatsapp' | string; // Objeto, 'whatsapp', o URL de geolocalización

  // Campos para historial de estados
  statusHistory?: StatusHistoryEntry[];

  // Campos para cancelaciones
  cancelReason?: string;
  cancelledAt?: any; // Firestore Timestamp
  cancelledBy?: string; // UID del admin

  // Campos para búsqueda (denormalización)
  userName?: string;
  userEmail?: string;
  userPhone?: string;

  // Campos para métricas
  deliveredAt?: any; // Firestore Timestamp - cuando se completó la entrega

  // Campos para futuro (preparación para Fase 1 - Repartidores)
  driverId?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  driverLocation?: {
    lat: number;
    lng: number;
    lastUpdated: any; // Firestore Timestamp
  } | null;
}

