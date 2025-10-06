'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Flame } from 'lucide-react';
import { getSpiceRecommendation } from '@/app/actions';
import type { SuggestSpiceLevelOutput } from '@/ai/flows/suggest-spice-level';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

export default function SpiceRecommender() {
  const [isPending, startTransition] = useTransition();
  const [recommendation, setRecommendation] = useState<SuggestSpiceLevelOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRecommendation = () => {
    setError(null);
    setRecommendation(null);
    startTransition(async () => {
      // Mock data for the AI function
      const mockInput = {
        orderHistory: ['Tacos al Pastor', 'Tacos de Camarón Enchilado'],
        preferences: 'Me gusta picante, pero no tanto como para no poder saborear la comida. Disfruto de los jalapeños.',
      };
      const result = await getSpiceRecommendation(mockInput);
      if (result.error) {
        setError(result.error);
      } else {
        setRecommendation(result as SuggestSpiceLevelOutput);
      }
    });
  };

  const SpiceLevelIcon = ({ level }: { level: string }) => {
    const levelMap: { [key: string]: number } = { 'Suave': 1, 'Medio': 2, 'Picante': 3, 'Extra Picante': 4, 'Mild': 1, 'Medium': 2, 'Hot': 3, 'Extra Hot': 4 };
    const rating = levelMap[level] || 0;
    return (
        <div className="flex items-center gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
                <Flame key={i} size={24} className={i < rating ? 'text-amber-400 fill-current' : 'text-muted-foreground/30'} />
            ))}
        </div>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-card to-background border-primary/20 shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
                <CardTitle className="font-headline text-2xl">¿Te Atreves o Prefieres?</CardTitle>
                <CardDescription>Deja que nuestra IA encuentre tu nivel de picante perfecto.</CardDescription>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {!isPending && !recommendation && !error && (
            <Button onClick={handleRecommendation} disabled={isPending} className="w-full font-headline">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Recomiéndame Picante'}
            </Button>
        )}
        
        {isPending && (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
                <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                <span className="font-headline text-lg">Encontrando tu fuego...</span>
            </div>
        )}

        {error && (
            <Alert variant="destructive">
                <AlertTitle>¡Ups!</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {recommendation && (
            <div className="text-center p-4 bg-background/50 rounded-lg">
                <h4 className="font-headline text-lg text-muted-foreground">Nuestra sugerencia para ti:</h4>
                <div className="my-3 flex flex-col items-center">
                    <p className="font-headline text-4xl text-primary">{recommendation.spiceLevel.replace('Hot', 'Picante').replace('Mild', 'Suave').replace('Medium', 'Medio').replace('Extra Hot', 'Extra Picante')}</p>
                    <SpiceLevelIcon level={recommendation.spiceLevel} />
                </div>
                <p className="text-sm text-muted-foreground italic">"{recommendation.reason}"</p>
                <Button onClick={handleRecommendation} variant="link" size="sm" className="mt-4">Intentar de nuevo</Button>
            </div>
        )}

      </CardContent>
    </Card>
  );
}
