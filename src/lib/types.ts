// This file contains shared type definitions for the application.

export type SaleProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  
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
export interface Order {
  userId: string;
  items: CartItem[];
  totalVerified: number;
  paymentMethod: 'Efectivo' | 'Tarjeta a la entrega' | 'Transferencia bancaria';
  status: 'Recibido' | 'En preparación' | 'En camino' | 'Entregado' | 'Cancelado';
  createdAt: any; // Debería ser un Timestamp de Firestore, pero 'any' es más simple en cliente
  shippingAddress: Address | 'whatsapp' | string; // Objeto, 'whatsapp', o URL de geolocalización
}

