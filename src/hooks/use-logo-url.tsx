'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import useSignedUrl from './use-signed-url';

/**
 * Hook personalizado que obtiene la URL del logo desde Firestore config
 * y genera su signed URL desde Firebase Storage
 *
 * @returns {Object} - { logoUrl, isLoading, error }
 */
export function useLogoUrl() {
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [configError, setConfigError] = useState<Error | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Consultar Firestore para obtener el path del logo
  useEffect(() => {
    const fetchLogoPath = async () => {
      try {
        setIsLoadingConfig(true);
        setConfigError(null);

        const configRef = doc(db, 'config', 'site');
        const configSnap = await getDoc(configRef);

        if (configSnap.exists()) {
          const data = configSnap.data();
          setLogoPath(data.logoPath || null);
        } else {
          // Si no existe el documento, usar valor por defecto
          setLogoPath('logos/header-logo.png');
        }
      } catch (e: any) {
        console.error('Error fetching logo config:', e);
        setConfigError(e);
        // Fallback al valor por defecto en caso de error
        setLogoPath('logos/header-logo.png');
      } finally {
        setIsLoadingConfig(false);
      }
    };

    fetchLogoPath();
  }, []);

  // Obtener la signed URL usando el path obtenido
  const { signedUrl, isLoading: isLoadingUrl, error: urlError } = useSignedUrl(logoPath);

  return {
    logoUrl: signedUrl,
    isLoading: isLoadingConfig || isLoadingUrl,
    error: configError || urlError,
  };
}
