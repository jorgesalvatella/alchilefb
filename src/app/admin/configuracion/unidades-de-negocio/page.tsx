'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import { PlusCircle, FileText } from 'lucide-react';
import { useState } from 'react';
import type { BusinessUnit } from '@/lib/data';
import { AddEditBusinessUnitDialog } from '@/components/admin/add-edit-business-unit-dialog';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import Link from 'next/link';

export default function AdminBusinessUnitsPage() {
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<BusinessUnit | null>(null);

  const businessUnitsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'business_units') : null),
    [firestore]
  );
  const { data: businessUnits, isLoading } = useCollection<BusinessUnit>(businessUnitsCollection);

  const handleEdit = (item: BusinessUnit) => {
    setSelectedUnit(item);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedUnit(null);
    setDialogOpen(true);
  };
  
  const handleDelete = (unitId: string) => {
    if (!firestore) return;
    if (window.confirm('¿Estás seguro de que quieres eliminar esta unidad de negocio?')) {
        const docRef = doc(firestore, 'business_units', unitId);
        deleteDocumentNonBlocking(docRef);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestión de Unidades de Negocio</CardTitle>
          <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Añadir Unidad
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Cédula Fiscal</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Cargando unidades de negocio...
                  </TableCell>
                </TableRow>
              )}
              {businessUnits?.map((unit) => (
                <TableRow key={unit.id}>
                  <TableCell className="font-medium">{unit.name}</TableCell>
                  <TableCell>{unit.address}</TableCell>
                  <TableCell>{unit.phone}</TableCell>
                  <TableCell>
                    {unit.taxIdUrl ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={unit.taxIdUrl} target="_blank">
                          <FileText className="mr-2 h-4 w-4" /> Ver
                        </Link>
                      </Button>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(unit as BusinessUnit)}
                    >
                      Editar
                    </Button>
                     <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(unit.id)}
                    >
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AddEditBusinessUnitDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        businessUnit={selectedUnit}
      />
    </>
  );
}
