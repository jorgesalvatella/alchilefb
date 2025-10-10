'use server';

import { suggestSpiceLevel, type SuggestSpiceLevelInput } from '@/ai/flows/suggest-spice-level';
import { z } from 'zod';

const SuggestSpiceLevelActionSchema = z.object({
  orderHistory: z.array(z.string()),
  preferences: z.string(),
});

export async function getSpiceRecommendation(input: SuggestSpiceLevelInput) {
  const parsedInput = SuggestSpiceLevelActionSchema.safeParse(input);

  if (!parsedInput.success) {
    return { error: 'Invalid input.' };
  }

  try {
    const result = await suggestSpiceLevel(parsedInput.data);
    return { ...result, error: null };
  } catch (error) {
    console.error('Error getting spice recommendation:', error);
    return { error: 'An unexpected error occurred while getting your recommendation.' };
  }
}
