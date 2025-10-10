'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Building, Briefcase, Users, Lightbulb, Truck, PlusCircle } from 'lucide-react';
import { AddEditBusinessUnitDialog } from '@/components/control/add-edit-business-unit-dialog';

const catalogs = [
  {
    name: 'Unidades de Negocio',
    description: 'Gestiona sucursales, y desde ahí sus departamentos, grupos y conceptos.',
    icon: Building,
    href: '/control/catalogo/unidades-de-negocio',
    action: 'openBusinessUnitDialog',
  },
  {
    name: 'Proveedores',
    description: 'Gestiona la lista global de todos los proveedores.',
    icon: Truck,
    href: '/control/finanzas/proveedores'
  }
];

export default function CatalogoPage() {
  const [businessUnitDialogOpen, setBusinessUnitDialogOpen] = useState(false);

  return (
    <>
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-7xl font-black text-white">
          <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
            Catálogos
          </span>
        </h1>
        <p className="text-white/60 mt-4 text-lg md:text-xl">Gestiona la información maestra de la aplicación.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {catalogs.map((catalog, index) => (
          <Card 
            key={catalog.name} 
            className={`bg-black/50 backdrop-blur-sm border-white/10 text-white flex flex-col ${index === 0 ? 'lg:col-start-2' : ''}`}
          >
            <CardHeader className="flex-grow">
              <div className="flex items-center gap-4">
                <catalog.icon className="h-8 w-8 text-orange-400" />
                <CardTitle className="text-2xl font-bold text-white">{catalog.name}</CardTitle>
              </div>
              <CardDescription className="text-white/60 pt-4">{catalog.description}</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-between">
              <Link href={catalog.href} className="w-full">
                <Button className="w-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 text-white font-bold hover:scale-105 transition-transform duration-300">
                  Administrar
                </Button>
              </Link>
              {catalog.action === 'openBusinessUnitDialog' && (
                <Button onClick={() => setBusinessUnitDialogOpen(true)} size="icon" variant="ghost" className="ml-2 text-white/60 hover:text-green-400">
                  <PlusCircle className="h-6 w-6" />
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      <AddEditBusinessUnitDialog
        isOpen={businessUnitDialogOpen}
        onOpenChange={setBusinessUnitDialogOpen}
        businessUnit={null}
      />
    </>
  );
}