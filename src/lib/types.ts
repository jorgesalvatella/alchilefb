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
