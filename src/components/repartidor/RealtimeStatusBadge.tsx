'use client';

import { Badge } from '@/components/ui/badge';

interface RealtimeStatusBadgeProps {
  loading: boolean;
  error: string | null;
}

export function RealtimeStatusBadge({ loading, error }: RealtimeStatusBadgeProps) {
  if (loading) {
    return (
      <Badge
        variant="outline"
        className="bg-yellow-500/10 text-yellow-500 border-yellow-500 animate-pulse"
      >
        <span className="mr-1">⏳</span>
        CONECTANDO...
      </Badge>
    );
  }

  if (error) {
    return (
      <Badge
        variant="outline"
        className="bg-red-500/10 text-red-500 border-red-500"
      >
        <span className="mr-1">🔴</span>
        DESCONECTADO
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-green-500/10 text-green-500 border-green-500"
    >
      <span className="mr-1">⚡</span>
      EN VIVO
    </Badge>
  );
}
