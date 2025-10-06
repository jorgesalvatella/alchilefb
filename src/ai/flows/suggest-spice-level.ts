'use server';

/**
 * @fileOverview AI agent that suggests a spice level for the user's order.
 *
 * - suggestSpiceLevel - A function that suggests a spice level based on user's order history and preferences.
 * - SuggestSpiceLevelInput - The input type for the suggestSpiceLevel function.
 * - SuggestSpiceLevelOutput - The return type for the suggestSpiceLevel function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestSpiceLevelInputSchema = z.object({
  orderHistory: z
    .array(z.string())
    .describe('El historial de pedidos del usuario, lista de nombres de platillos.'),
  preferences: z.string().describe('Las preferencias del usuario por la comida picante.'),
});
export type SuggestSpiceLevelInput = z.infer<typeof SuggestSpiceLevelInputSchema>;

const SuggestSpiceLevelOutputSchema = z.object({
  spiceLevel: z
    .string()
    .describe(
      'El nivel de picante sugerido para el pedido. Valores posibles: Suave, Medio, Picante, Extra Picante.'
    ),
  reason: z.string().describe('La explicación de por qué se sugirió el nivel de picante.'),
});
export type SuggestSpiceLevelOutput = z.infer<typeof SuggestSpiceLevelOutputSchema>;

export async function suggestSpiceLevel(
  input: SuggestSpiceLevelInput
): Promise<SuggestSpiceLevelOutput> {
  return suggestSpiceLevelFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestSpiceLevelPrompt',
  input: {schema: SuggestSpiceLevelInputSchema},
  output: {schema: SuggestSpiceLevelOutputSchema},
  prompt: `Eres un asistente de IA especializado en sugerir niveles de picante para pedidos de comida. Tu respuesta debe ser en español.

  Basado en el historial de pedidos y las preferencias del usuario, sugiere un nivel de picante para su pedido actual.

  Historial de Pedidos: {{orderHistory}}
  Preferencias: {{preferences}}

  Considera los siguientes niveles de picante:
  - Suave
  - Medio
  - Picante
  - Extra Picante

  Proporciona una breve explicación para tu sugerencia.
  Salida en formato JSON:
  {
    "spiceLevel": "nivel de picante sugerido",
    "reason": "explicación de la sugerencia"
  }`,
});

const suggestSpiceLevelFlow = ai.defineFlow(
  {
    name: 'suggestSpiceLevelFlow',
    inputSchema: SuggestSpiceLevelInputSchema,
    outputSchema: SuggestSpiceLevelOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
