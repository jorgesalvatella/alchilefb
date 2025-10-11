import data from './placeholder-images.json';

export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

const images: ImagePlaceholder[] = data.placeholderImages;

export const PlaceHolderImages = {
  // Obtener todas las imágenes
  getAll: (): ImagePlaceholder[] => images,

  // Obtener una imagen aleatoria basada en una descripción (busca por coincidencia parcial)
  getRandomImage: (hint?: string): ImagePlaceholder => {
    if (!hint) {
      // Si no hay hint, retornar cualquier imagen aleatoria
      const randomIndex = Math.floor(Math.random() * images.length);
      return images[randomIndex];
    }

    // Buscar imágenes que coincidan con el hint (case insensitive)
    const lowerHint = hint.toLowerCase();
    const matches = images.filter(
      (img) =>
        img.imageHint.toLowerCase().includes(lowerHint) ||
        img.description.toLowerCase().includes(lowerHint)
    );

    if (matches.length > 0) {
      // Retornar una coincidencia aleatoria
      const randomIndex = Math.floor(Math.random() * matches.length);
      return matches[randomIndex];
    }

    // Si no hay coincidencias, retornar una imagen aleatoria
    const randomIndex = Math.floor(Math.random() * images.length);
    return images[randomIndex];
  },

  // Obtener imagen por ID
  getById: (id: string): ImagePlaceholder | undefined => {
    return images.find((img) => img.id === id);
  },

  // Obtener múltiples imágenes aleatorias
  getRandomImages: (count: number, hint?: string): ImagePlaceholder[] => {
    const result: ImagePlaceholder[] = [];
    const pool = hint
      ? images.filter(
          (img) =>
            img.imageHint.toLowerCase().includes(hint.toLowerCase()) ||
            img.description.toLowerCase().includes(hint.toLowerCase())
        )
      : images;

    // Si no hay suficientes imágenes, retornar todas las disponibles
    if (pool.length <= count) {
      return [...pool];
    }

    // Seleccionar imágenes aleatorias sin repetición
    const used = new Set<number>();
    while (result.length < count) {
      const randomIndex = Math.floor(Math.random() * pool.length);
      if (!used.has(randomIndex)) {
        used.add(randomIndex);
        result.push(pool[randomIndex]);
      }
    }

    return result;
  },
};
