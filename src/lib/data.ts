export type MenuItem = {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  category: 'Tacos' | 'Burritos' | 'Sides' | 'Drinks';
  image: string; // Corresponds to id in placeholder-images.json
  ingredients: string[];
  options?: { name: string; price: number }[];
  spiceRating: 1 | 2 | 3 | 4 | 5;
};

export const menuItems: MenuItem[] = [
  {
    id: 'taco-al-pastor',
    name: 'Tacos al Pastor',
    description: 'Marinated pork, pineapple, onion, cilantro.',
    longDescription: 'A classic from the streets of Mexico City. Tender pork is marinated in a blend of dried chiles, spices, and pineapple, then slow-cooked on a vertical rotisserie. Served on warm corn tortillas with a slice of fresh pineapple, finely chopped onions, and cilantro.',
    price: 3.50,
    category: 'Tacos',
    image: 'taco-al-pastor',
    ingredients: ['Pork', 'Pineapple', 'Onion', 'Cilantro', 'Corn Tortilla'],
    spiceRating: 2,
  },
  {
    id: 'burrito-asada',
    name: 'Carne Asada Burrito',
    description: 'Grilled steak, rice, beans, pico de gallo, cheese.',
    longDescription: 'A hearty burrito packed with flavor. Juicy, grilled carne asada is wrapped in a large flour tortilla with seasoned rice, creamy pinto beans, fresh pico de gallo, and a blend of Mexican cheeses. A complete meal in your hands.',
    price: 12.99,
    category: 'Burritos',
    image: 'burrito-asada',
    ingredients: ['Grilled Steak', 'Rice', 'Pinto Beans', 'Pico de Gallo', 'Cheese', 'Flour Tortilla'],
    spiceRating: 1,
  },
  {
    id: 'taco-camaron',
    name: 'Camarón Enchilado Tacos',
    description: 'Spicy shrimp, cabbage slaw, chipotle aioli.',
    longDescription: 'A coastal favorite with a fiery twist. Plump shrimp are sautéed in a spicy chili garlic sauce, then placed in warm corn tortillas and topped with a crisp cabbage slaw and a smoky chipotle aioli. A perfect balance of heat and cool crunch.',
    price: 4.50,
    category: 'Tacos',
    image: 'taco-camaron',
    ingredients: ['Shrimp', 'Cabbage', 'Chipotle Aioli', 'Chili Garlic Sauce', 'Corn Tortilla'],
    spiceRating: 4,
  },
  {
    id: 'guacamole',
    name: 'Fresh Guacamole & Chips',
    description: 'Avocado, lime, onion, cilantro, jalapeño.',
    longDescription: 'Made fresh to order, our signature guacamole features ripe avocados mashed with fresh lime juice, finely chopped onion, cilantro, and a hint of jalapeño for a slight kick. Served with a generous portion of house-made crispy tortilla chips.',
    price: 8.50,
    category: 'Sides',
    image: 'guacamole',
    ingredients: ['Avocado', 'Lime', 'Onion', 'Cilantro', 'Jalapeño', 'Tortilla Chips'],
    spiceRating: 1,
  },
  {
    id: 'horchata',
    name: 'Classic Horchata',
    description: 'Sweet rice milk with cinnamon and vanilla.',
    longDescription: 'A refreshing and traditional Mexican beverage. Our horchata is made from scratch with long-grain rice, cinnamon, and a touch of vanilla for a creamy, sweet drink that perfectly complements any spicy meal. Served chilled over ice.',
    price: 4.00,
    category: 'Drinks',
    image: 'horchata',
    ingredients: ['Rice', 'Water', 'Cinnamon', 'Vanilla', 'Sugar'],
    spiceRating: 0,
  },
  {
    id: 'salsa-bar-sampler',
    name: 'Salsa Sampler',
    description: 'A trio of our signature house-made salsas.',
    longDescription: 'Can\'t decide? Try a flight of our three signature salsas: a tangy Salsa Verde made with tomatillos, a classic smoky Salsa Roja, and a fiery Habanero salsa for the brave. Served with plenty of crispy tortilla chips for dipping.',
    price: 6.00,
    category: 'Sides',
    image: 'salsa-bar',
    ingredients: ['Tomatillos', 'Tomatoes', 'Habanero Peppers', 'Onion', 'Cilantro', 'Spices'],
    spiceRating: 3,
  },
];

export const menuCategories = ['Tacos', 'Burritos', 'Sides', 'Drinks'];
