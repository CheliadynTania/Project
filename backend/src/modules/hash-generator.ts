import { nanoid } from 'nanoid';
import { contentRepository } from './content-repository.js';

const HASH_LENGTH = 8;
const MAX_ATTEMPTS = 5;

export async function generateUniqueHash(): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const hash = nanoid(HASH_LENGTH);
    const existing = await contentRepository.findByHash(hash);
    if (!existing) return hash;
  }
  throw new Error('Failed to generate unique hash after max attempts');
}