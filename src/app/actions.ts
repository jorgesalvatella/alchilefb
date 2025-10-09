'use server';

import { suggestSpiceLevel, type SuggestSpiceLevelInput } from '@/ai/flows/suggest-spice-level';
import { z } from 'zod';

import { admin } from '@/firebase';
import { getStorage } from 'firebase-admin/storage';

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

export async function uploadFile(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file) {
    return { error: 'No file provided.' };
  }

  const bucket = getStorage(admin).bucket();
  const fileName = `${Date.now()}-${file.name}`;
  const fileRef = bucket.file(`tax_ids/${fileName}`);

  const fileBuffer = Buffer.from(await file.arrayBuffer());

  await fileRef.save(fileBuffer, {
    metadata: {
      contentType: file.type,
    },
  });

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileRef.name}`;

  return { url: publicUrl, error: null };
}
