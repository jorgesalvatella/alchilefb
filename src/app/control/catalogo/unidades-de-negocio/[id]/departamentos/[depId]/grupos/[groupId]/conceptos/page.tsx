'use client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import type { Concept } from '@/lib/data';
import { PlusCircle, Pen, Trash2, Link2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/firebase/provider';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// TODO: Crear el diálogo para añadir/editar conceptos

export default function AdminConceptsPage() {
  const { user } = useAuth();
  const params = useParams();
  const businessUnitId = params.id as string;
  const departmentId = params.depId as string;
  const groupId = params.groupId as string;

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !businessUnitId || !departmentId || !groupId) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const response = await fetch(`/api/control/unidades-de-negocio/${businessUnitId}/departamentos/${departmentId}/grupos/${groupId}/conceptos`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('No se pudo obtener los conceptos.');
        }

        const data = await response.json();
        setConcepts(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, businessUnitId, departmentId, groupId]);

  const handleAddNew = () => {
    console.log("TODO: Implementar añadir nuevo concepto");
  };

  const handleEdit = (item: Concept) => {
    console.log("TODO: Implementar editar concepto", item);
  };

  const handleDelete = (id: string) => {
    console.log(`TODO: Implementar borrado para el ID: ${id} a través de la API`);
  };

  return (
    <>
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-black text-white">
          <span className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 bg-clip-text text-transparent">
            Conceptos
          </span>
        </h1>
      </div>

      <div className="flex justify-end mb-8">
        <Button onClick={handleAddNew} className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold py-6 px-8 rounded-full hover:scale-105 transition-transform duration-300">
          <PlusCircle className="mr-2 h-5 w-5" />
          Añadir Concepto
        </Button>
      </div>

      <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-white/10 hover:bg-transparent">
              <TableHead className="text-white/80">Nombre</TableHead>
              <TableHead className="text-right text-white/80">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow className="border-b-0">
                <TableCell colSpan={2} className="text-center text-white/60 py-12">
                  Cargando conceptos...
                </TableCell>
              </TableRow>
            )}
            {error && (
              <TableRow className="border-b-0">
                <TableCell colSpan={2} className="text-center text-red-500 py-12">
                  Error: {error}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !error && concepts.map((concept) => (
              <TableRow key={concept.id} className="border-b border-white/10 hover:bg-white/5">
                <TableCell className="font-medium text-white">{concept.name}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(concept as Concept)}
                    className="text-white/60 hover:text-orange-400"
                  >
                    <Pen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(concept.id)}
                    className="text-white/60 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {/* Link para asociar proveedores */}
                  <Link href={`/admin/catalogo/conceptos/${concept.id}/proveedores`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/60 hover:text-green-400"
                    >
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
