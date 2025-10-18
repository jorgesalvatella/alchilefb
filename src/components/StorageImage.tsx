'use client';

import Image from 'next/image';
import useSignedUrl from '@/hooks/use-signed-url';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

interface StorageImageProps {
  filePath: string | null | undefined;
  alt: string;
  fill: boolean;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  className?: string;
  sizes?: string;
}

const StorageImage = ({ filePath, alt, fill, objectFit = 'cover', className, sizes = '100vw' }: StorageImageProps) => {
  // Si ya es una URL completa de Firebase Storage con token, úsala directamente
  if (filePath && filePath.startsWith('https://firebasestorage.googleapis.com/') && filePath.includes('token=')) {
    return (
      <Image
        src={filePath}
        alt={alt}
        fill={fill}
        sizes={sizes}
        className={className}
        style={{ objectFit }}
      />
    );
  }

  let relativePath = filePath;

  // Si el filePath es una URL completa de GCS sin token, extrae la ruta relativa.
  if (filePath && filePath.startsWith('https://storage.googleapis.com/')) {
    try {
      const url = new URL(filePath);
      // El pathname es /<bucket>/<ruta...>, lo dividimos y nos quedamos con la ruta.
      relativePath = url.pathname.split('/').slice(2).join('/');
    } catch (error) {
      console.error('Invalid image URL:', error);
      relativePath = null; // Falla de forma segura si la URL no es válida
    }
  }

  const { signedUrl, isLoading, error } = useSignedUrl(relativePath);

  if (isLoading) {
    return <Skeleton className={className} />;
  }

  if (error || !signedUrl) {
    return (
      <div
        className={`${className} flex flex-col items-center justify-center bg-muted text-muted-foreground`}
      >
        <AlertTriangle className="h-8 w-8" />
        <span className="text-xs mt-2 text-center">No se pudo cargar la imagen</span>
      </div>
    );
  }

  return (
    <Image
      src={signedUrl}
      alt={alt}
      fill={fill}
      sizes={sizes}
      className={className}
      style={{ objectFit }}
    />
  );
};

export default StorageImage;
