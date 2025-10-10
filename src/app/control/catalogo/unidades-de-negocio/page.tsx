'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { BusinessUnit } from '@/lib/data';
import { PlusCircle, Pen, Trash2, FolderKanban } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AddEditBusinessUnitDialog } from '@/components/control/add-edit-business-unit-dialog';
import { useUser } from '@/firebase/provider'; // Hook correcto para el estado del usuario
import Link from 'next/link';

export default function AdminBusinessUnitsPage() {
  const { user, isUserLoading } = useUser(); // Obtener el usuario y el estado de carga
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState<BusinessUnit | null>(null);

  useEffect(() => {
    // El useEffect ahora espera a que la carga del usuario termine
    if (isUserLoading) {
      return; // No hacer nada mientras se verifica la sesión
    }
    if (!user) {
      setIsLoading(false); // Si no hay usuario, terminamos de cargar
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/control/unidades-de-negocio', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('No se pudo obtener los datos.');
        }

        const data = await response.json();
        setBusinessUnits(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, isUserLoading]); // Se ejecuta cuando cambia el usuario o el estado de carga

  const handleEdit = (item: BusinessUnit) => {
    setSelectedBusinessUnit(item);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedBusinessUnit(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    // TODO: La lógica de borrado también debe migrarse a un endpoint en el backend
    console.log(`TODO: Implementar borrado para el ID: ${id} a través de la API`);
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
            <Button 
              onClick={handleAddNew} 
              className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300"
              disabled={isUserLoading} // Deshabilitado mientras carga el usuario
            >
                <PlusCircle className="mr-2 h-5 w-5" />
                Añadir Unidad de Negocio
            </Button>
        </div>

        <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="text-white/80">Nombre</TableHead>
                <TableHead className="text-white/80">Razón Social</TableHead>
                <TableHead className="text-white/80">Dirección</TableHead>
                <TableHead className="text-white/80">Teléfono</TableHead>
                <TableHead className="text-right text-white/80">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isLoading || isUserLoading) ? (
                <TableRow className="border-b-0">
                  <TableCell colSpan={5} className="text-center text-white/60 py-12">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow className="border-b-0">
                  <TableCell colSpan={5} className="text-center text-red-500 py-12">
                    Error: {error}
                  </TableCell>
                </TableRow>
              ) : businessUnits.map((unit) => (
                <TableRow key={unit.id} className="border-b border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{unit.name}</TableCell>
                  <TableCell className="text-white/80">{unit.razonSocial}</TableCell>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(unit.id)}
                      className="text-white/60 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Link href={`/control/catalogo/unidades-de-negocio/${unit.id}/departamentos`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/60 hover:text-blue-400"
                      >
                        <FolderKanban className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <AddEditBusinessUnitDialog
            isOpen={dialogOpen}
            onOpenChange={setDialogOpen}
            businessUnit={selectedBusinessUnit}
            user={user}
            isUserLoading={isUserLoading}
        />
    </>
  );
}