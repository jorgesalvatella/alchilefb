import { Timestamp } from "firebase/firestore";

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  category: 'Tacos' | 'Burritos' | 'Acompañamientos' | 'Bebidas';
  image?: string; // Corresponds to id in placeholder-images.json, now optional
  imageUrl?: string; // URL from Firebase Storage
  ingredients: string[];
  options?: { name: string; price: number }[];
  spiceRating: 1 | 2 | 3 | 4 | 5;
};

export type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  defaultDeliveryAddressId?: string;
  paymentMethodIds?: string[];
  orderHistoryIds?: string[];
  spicePreference?: string;
  role: 'customer' | 'admin' | 'super-admin';
}

export type Order = {
  id: string;
  userId: string;
  customerName?: string;
  orderDate: Timestamp;
  deliveryAddress: string;
  totalAmount: number;
  orderStatus: 'Pedido Realizado' | 'Preparando' | 'En Reparto' | 'Entregado';
  items: {
    menuItemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }[];
}

export const menuCategories: ('Tacos' | 'Burritos' | 'Acompañamientos' | 'Bebidas')[] = ['Tacos', 'Burritos', 'Acompañamientos', 'Bebidas'];

export const expenseCategories = {
  departments: ['Operaciones', 'Marketing', 'Administración', 'Cocina'],
  groups: ['Nómina', 'Renta', 'Servicios Públicos', 'Insumos', 'Publicidad'],
  concepts: {
    Operaciones: ['Salarios Cocina', 'Salarios Reparto', 'Mantenimiento Equipo'],
    Marketing: ['Publicidad en Redes', 'Promociones', 'Eventos'],
    Administración: ['Software Contable', 'Honorarios Legales', 'Material de Oficina'],
    Cocina: ['Carne', 'Verduras', 'Lácteos', 'Bebidas', 'Empaques'],
  },
};

export type Expense = {
  id: string;
  date: Timestamp;
  amount: number;
  description: string;
  supplierId?: string;
  paymentMethod: 'Efectivo' | 'Tarjeta de Crédito' | 'Transferencia Bancaria';
  department: string;
  group: string;
  concept: string;
};

export type Supplier = {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
};

export type BusinessUnit = {
  id: string;
  name: string;
  address: string;
  phone: string;
  taxIdUrl?: string;
};
    