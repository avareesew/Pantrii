import { createHash } from 'crypto';
import { readFile } from 'fs/promises';

/**
 * Generate a SHA-256 hash of a file for caching purposes
 */
export async function hashFile(filepath: string): Promise<string> {
  const fileBuffer = await readFile(filepath);
  return createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Generate a hash from a buffer (for uploaded files)
 */
export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

