'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase/provider';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import type { MenuItem } from '@/lib/data';

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
  const [isSeeded, setIsSeeded] = useState<boolean | null>(null);

  useEffect(() => {
    const seedData = async () => {
      if (!firestore) return;
      
      const menuItemsCollection = collection(firestore, 'menu_items');
      const snapshot = await getDocs(menuItemsCollection);

      if (snapshot.empty) {
        console.log('La colección "menu_items" está vacía. Precargando datos...');
        const batch = writeBatch(firestore);
        
        sampleMenuItems.forEach(item => {
          const docRef = collection(firestore, 'menu_items');
          // Firestore will auto-generate an ID when we call addDoc or in this case, a new doc() ref in a batch
          batch.set(docRef.doc(), item);
        });

        try {
          await batch.commit();
          console.log('¡Datos de platillos precargados con éxito!');
          setIsSeeded(true);
        } catch (error) {
          console.error("Error al precargar datos: ", error);
          setIsSeeded(false);
        }
      } else {
        console.log('La colección "menu_items" ya contiene datos. No se necesita precarga.');
        setIsSeeded(true);
      }
    };

    // Solo ejecuta la precarga una vez
    if (isSeeded === null) {
      seedData();
    }
  }, [firestore, isSeeded]);

  // Este componente no renderiza nada en la UI
  return null;
}
