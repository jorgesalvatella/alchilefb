'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
import type { BusinessUnit } from '@/lib/data';
import { PlusCircle, Pen } from 'lucide-react';
import { useState } from 'react';

export default function AdminBusinessUnitsPage() {
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<BusinessUnit | null>(null);

  const businessUnitsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'business_units') : null),
    [firestore]
  );
  const { data: businessUnits, isLoading } = useCollection<BusinessUnit>(businessUnitsCollection);

  const handleEdit = (item: BusinessUnit) => {
    setSelectedBusinessUnit(item);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedBusinessUnit(null);
    setDialogOpen(true);
  };

  return (
    <>
        <div className="text-center mb-12">
            <h1 className="text-5xl md:text-7xl font-black text-white">
                <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
                    Unidades de Negocio
                </span>
            </h1>
        </div>

        <div className="flex justify-end mb-8">
            <Button onClick={handleAddNew} className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
                <PlusCircle className="mr-2 h-5 w-5" />
                Añadir Unidad de Negocio
            </Button>
        </div>

        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="text-white/80">Nombre</TableHead>
                <TableHead className="text-white/80">Dirección</TableHead>
                <TableHead className="text-white/80">Teléfono</TableHead>
                <TableHead className="text-right text-white/80">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={4} className="text-center text-white/60 py-12">
                    Cargando unidades de negocio...
                  </TableCell>
                </TableRow>
              )}
              {businessUnits && businessUnits.map((unit) => (
                <TableRow key={unit.id} className="border-b border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{unit.name}</TableCell>
                  <TableCell className="text-white/80">{unit.address}</TableCell>
                  <TableCell className="text-white/80">{unit.phone}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(unit as BusinessUnit)}
                      className="text-white/60 hover:text-orange-400"
                    >
                      <Pen className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* <AddEditBusinessUnitDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        businessUnit={selectedBusinessUnit}
      /> */}
    </>
  );
}
