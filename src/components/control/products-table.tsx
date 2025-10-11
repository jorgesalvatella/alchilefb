'use client';

import { MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Definimos el tipo de dato para un producto de venta, basándonos en nuestro modelo de datos
type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  isAvailable: boolean;
  createdAt: string;
};

type ProductsTableProps = {
  data: Product[];
  // TODO: Añadir funciones para manejar la edición y eliminación
  // onEdit: (product: Product) => void;
  // onDelete: (product: Product) => void;
};

export function ProductsTable({ data, onEdit, onDelete }: ProductsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Categoría</TableHead>
          <TableHead>Disponibilidad</TableHead>
          <TableHead className="text-right">Precio</TableHead>
          <TableHead>
            <span className="sr-only">Acciones</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((product) => (
          <TableRow key={product.id}>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>{product.category}</TableCell>
            <TableCell>
              <Badge variant={product.isAvailable ? 'default' : 'destructive'} className={product.isAvailable ? 'bg-fresh-green text-black' : ''}>
                {product.isAvailable ? 'Disponible' : 'No Disponible'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              ${product.price.toFixed(2)}
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-haspopup="true" size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-black border-white/10 text-white">
                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => onEdit(product)}>Editar</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onDelete(product)}>Eliminar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
