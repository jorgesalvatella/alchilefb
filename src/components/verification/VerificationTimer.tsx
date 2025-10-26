'use client';

import { useState, useEffect } from 'react';

interface VerificationTimerProps {
  expiresAt: Date;
  onExpire?: () => void;
}

export default function VerificationTimer({ expiresAt, onExpire }: VerificationTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    // Calcular tiempo restante inicial
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiryTime = new Date(expiresAt).getTime();
      const remaining = Math.max(0, expiryTime - now);
      return Math.floor(remaining / 1000); // Convertir a segundos
    };

    // Actualizar inmediatamente
    setTimeRemaining(calculateTimeRemaining());

    // Actualizar cada segundo
    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);

      // Llamar onExpire cuando expire
      if (remaining === 0 && onExpire) {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  // Formatear tiempo: MM:SS
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Color basado en tiempo restante
  const getColorClass = () => {
    if (timeRemaining === 0) return 'text-red-500';
    if (timeRemaining < 60) return 'text-orange-500';
    if (timeRemaining < 180) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="text-center mb-6">
      <p className="text-white/60 text-sm mb-1">
        {timeRemaining === 0 ? 'Código expirado' : 'Expira en:'}
      </p>
      <p className={`text-2xl font-bold ${getColorClass()} font-mono`}>
        {formattedTime}
      </p>
    </div>
  );
}
