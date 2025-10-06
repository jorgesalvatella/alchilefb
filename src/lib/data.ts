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

export const menuItems: MenuItem[] = [
  {
    id: 'taco-al-pastor',
    name: 'Tacos al Pastor',
    description: 'Cerdo marinado, piña, cebolla, cilantro.',
    longDescription: 'Un clásico de las calles de la Ciudad de México. Tierna carne de cerdo marinada en una mezcla de chiles secos, especias y piña, cocinada lentamente en un asador vertical. Servido en tortillas de maíz calientes con una rodaja de piña fresca, cebolla finamente picada y cilantro.',
    price: 3.50,
    category: 'Tacos',
    image: 'taco-al-pastor',
    ingredients: ['Cerdo', 'Piña', 'Cebolla', 'Cilantro', 'Tortilla de maíz'],
    spiceRating: 2,
  },
  {
    id: 'burrito-asada',
    name: 'Burrito de Carne Asada',
    description: 'Carne asada, arroz, frijoles, pico de gallo, queso.',
    longDescription: 'Un burrito sustancioso y lleno de sabor. Jugosa carne asada a la parrilla envuelta en una gran tortilla de harina con arroz sazonado, frijoles pintos cremosos, pico de gallo fresco y una mezcla de quesos mexicanos. Una comida completa en tus manos.',
    price: 12.99,
    category: 'Burritos',
    image: 'burrito-asada',
    ingredients: ['Carne Asada', 'Arroz', 'Frijoles Pintos', 'Pico de Gallo', 'Queso', 'Tortilla de Harina'],
    spiceRating: 1,
  },
  {
    id: 'taco-camaron',
    name: 'Tacos de Camarón Enchilado',
    description: 'Camarones picantes, ensalada de col, alioli de chipotle.',
    longDescription: 'Un favorito de la costa con un toque picante. Camarones regordetes salteados en una salsa picante de ajo y chile, luego colocados en tortillas de maíz calientes y cubiertos con una ensalada de col crujiente y un alioli de chipotle ahumado. Un equilibrio perfecto entre calor y frescura crujiente.',
    price: 4.50,
    category: 'Tacos',
    image: 'taco-camaron',
    ingredients: ['Camarón', 'Col', 'Alioli de Chipotle', 'Salsa de Ajo y Chile', 'Tortilla de Maíz'],
    spiceRating: 4,
  },
  {
    id: 'guacamole',
    name: 'Guacamole Fresco y Totopos',
    description: 'Aguacate, lima, cebolla, cilantro, jalapeño.',
    longDescription: 'Hecho fresco al momento, nuestro guacamole exclusivo presenta aguacates maduros machacados con jugo de lima fresco, cebolla finamente picada, cilantro y un toque de jalapeño para un ligero picor. Servido con una generosa porción de totopos crujientes hechos en casa.',
    price: 8.50,
    category: 'Acompañamientos',
    image: 'guacamole',
    ingredients: ['Aguacate', 'Lima', 'Cebolla', 'Cilantro', 'Jalapeño', 'Totopos'],
    spiceRating: 1,
  },
  {
    id: 'horchata',
    name: 'Horchata Clásica',
    description: 'Dulce leche de arroz con canela y vainilla.',
    longDescription: 'Una bebida refrescante y tradicional mexicana. Nuestra horchata se hace desde cero con arroz de grano largo, canela y un toque de vainilla para una bebida cremosa y dulce que complementa perfectamente cualquier comida picante. Se sirve fría sobre hielo.',
    price: 4.00,
    category: 'Bebidas',
    image: 'horchata',
    ingredients: ['Arroz', 'Agua', 'Canela', 'Vainilla', 'Azúcar'],
    spiceRating: 0,
  },
  {
    id: 'salsa-bar-sampler',
    name: 'Muestra de Salsas',
    description: 'Un trío de nuestras salsas caseras exclusivas.',
    longDescription: '¿No puedes decidir? Prueba una selección de nuestras tres salsas exclusivas: una Salsa Verde ácida hecha con tomatillos, una clásica Salsa Roja ahumada y una ardiente salsa de Habanero para los valientes. Se sirve con muchos totopos crujientes para mojar.',
    price: 6.00,
    category: 'Acompañamientos',
    image: 'salsa-bar',
    ingredients: ['Tomatillos', 'Tomates', 'Chiles Habaneros', 'Cebolla', 'Cilantro', 'Especias'],
    spiceRating: 3,
  },
];

export const menuCategories: ('Tacos' | 'Burritos' | 'Acompañamientos' | 'Bebidas')[] = ['Tacos', 'Burritos', 'Acompañamientos', 'Bebidas'];
