import { randomInt } from 'node:crypto';

// URL-safe, unambiguous alphabet: lowercase + digits, no 0/o/1/l/i look-alikes.
const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyz';
const DEFAULT_LEN = 8;

/** Generate a short, unguessable, transcription-friendly id. */
export function newId(len: number = DEFAULT_LEN): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}

/** True if the string is a plausible plan id (used to validate path params). */
export function isValidId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 4 &&
    value.length <= 24 &&
    [...value].every((c) => ALPHABET.includes(c))
  );
}
