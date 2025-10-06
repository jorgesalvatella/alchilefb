'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import type { MenuItem } from '@/lib/data';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const sampleMenuItems: Omit<MenuItem, 'id'>[] = [
    {
      name: "Tacos al Pastor",
      description: "Carne de cerdo marinada en achiote, asada lentamente y servida con piña.",
      longDescription: "Un clásico de la Ciudad de México. Nuestra carne de cerdo se marina durante 24 horas en una mezcla secreta de chiles y achiote, luego se asa en un trompo vertical y se sirve en tortillas de maíz calientes con un toque de piña, cilantro y cebolla.",
      price: 4.50,
      category: "Tacos",
      imageUrl: "https://imagenes.nobbora.com/taco-al-pastor.jpg",
      ingredients: ["Cerdo", "Achiote", "Piña", "Cilantro", "Cebolla"],
      spiceRating: 2,
    },
    {
      name: "Burrito de Barbacoa",
      description: "Carne de res cocida a fuego lento, envuelta en una tortilla de harina gigante.",
      longDescription: "Nuestra barbacoa se cocina a fuego lento durante 8 horas hasta que está increíblemente tierna. La envolvemos en una tortilla de harina tostada con arroz, frijoles negros, queso y nuestra salsa de la casa.",
      price: 14.99,
      category: "Burritos",
      imageUrl: "https://imagenes.nobbora.com/burrito-barbacoa.jpg",
      ingredients: ["Res", "Arroz", "Frijoles Negros", "Queso", "Salsa"],
      spiceRating: 1,
    },
    {
        name: "Esquites 'Al Chile'",
        description: "Granos de elote tierno con mayonesa, queso cotija, chile en polvo y lima.",
        longDescription: "El antojito callejero mexicano por excelencia. Servimos granos de elote calientes y tiernos en un vaso, cubiertos con una cremosa mayonesa, queso cotija salado, un toque de chile en polvo y un chorrito de jugo de lima fresca. ¡No podrás comer solo uno!",
        price: 6.00,
        category: "Acompañamientos",
        imageUrl: "https://imagenes.nobbora.com/esquites.jpg",
        ingredients: ["Elote", "Mayonesa", "Queso Cotija", "Chile en Polvo", "Lima"],
        spiceRating: 1,
    },
    {
        name: "Agua de Jamaica",
        description: "Agua fresca y refrescante hecha de flores de hibisco.",
        longDescription: "Una bebida tradicional mexicana, perfecta para acompañar cualquier platillo. Hacemos nuestra agua de jamaica fresca todos los días, infusionando flores de hibisco secas para crear una bebida vibrante, ligeramente ácida y muy refrescante.",
        price: 3.50,
        category: "Bebidas",
        imageUrl: "https://imagenes.nobbora.com/agua-jamaica.jpg",
        ingredients: ["Flor de Jamaica", "Agua", "Azúcar"],
        spiceRating: 1,
    }
];


export function SeedDatabase() {
  const firestore = useFirestore();
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    if (!firestore) return;

    const seedData = async () => {
      const menuItemsCollection = collection(firestore, 'menu_items');
      
      try {
        const querySnapshot = await getDocs(menuItemsCollection);
        if (querySnapshot.empty) {
          setIsSeeding(true);
          console.log('La colección "menu_items" está vacía. Precargando datos...');

          for (const item of sampleMenuItems) {
            await addDoc(menuItemsCollection, item).catch(serverError => {
                 // Lanzamos un error contextual si una escritura individual falla
                 const permissionError = new FirestorePermissionError({
                    path: menuItemsCollection.path,
                    operation: 'create',
                    requestResourceData: item,
                 });
                 errorEmitter.emit('permission-error', permissionError);
                 throw permissionError; // Detenemos el proceso si un platillo falla
            });
          }
          console.log('Datos de platillos precargados con éxito.');
        }
      } catch (error) {
        console.error('Error al verificar o precargar datos: ', error);
        if (!(error instanceof FirestorePermissionError)) {
             const permissionError = new FirestorePermissionError({
                path: menuItemsCollection.path,
                operation: 'list', // The initial check is a list operation
             });
             errorEmitter.emit('permission-error', permissionError);
        }
      } finally {
        setIsSeeding(false);
      }
    };

    seedData();
  }, [firestore]);

  // Este componente no renderiza nada visible.
  return null;
}
