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
    .describe('The user historical orders, list of dish names.'),
  preferences: z.string().describe('The user preferences for spicy food.'),
});
export type SuggestSpiceLevelInput = z.infer<typeof SuggestSpiceLevelInputSchema>;

const SuggestSpiceLevelOutputSchema = z.object({
  spiceLevel: z
    .string()
    .describe(
      'The suggested spice level for the order. Possible values: Mild, Medium, Hot, Extra Hot.'
    ),
  reason: z.string().describe('The explanation why the spice level was suggested.'),
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
  prompt: `You are an AI assistant specializing in suggesting spice levels for food orders.

  Based on the user's order history and preferences, suggest a spice level for their current order.

  Order History: {{orderHistory}}
  Preferences: {{preferences}}

  Consider the following spice levels:
  - Mild
  - Medium
  - Hot
  - Extra Hot

  Provide a brief explanation for your suggestion.
  Output in JSON format:
  {
    "spiceLevel": "suggested spice level",
    "reason": "explanation for the suggestion"
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
