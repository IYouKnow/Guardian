import { describe, it, expect } from 'vitest';
import { ARGON2_PARAMS, deriveKey, generateSalt, isArgon2Available } from './argon2';

const toHex = (b: Uint8Array): string =>
  Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');

describe('Argon2id parameters', () => {
  it('meets the OWASP minimum (19 MiB / t=2 / p=1)', () => {
    expect(ARGON2_PARAMS.memoryCost).toBeGreaterThanOrEqual(19 * 1024);
    expect(ARGON2_PARAMS.timeCost).toBeGreaterThanOrEqual(2);
    expect(ARGON2_PARAMS.parallelism).toBe(1);
    expect(ARGON2_PARAMS.hashLength).toBe(32);
  });
});

describe('deriveKey', () => {
  it('loads the Argon2 WASM module rather than silently falling back', async () => {
    expect(await isArgon2Available()).toBe(true);
  });

  it('produces a 32-byte key', async () => {
    const key = await deriveKey('password', generateSalt());
    expect(key).toHaveLength(32);
  });

  it('is deterministic for the same password and salt', async () => {
    const salt = generateSalt();
    const a = await deriveKey('correct horse battery staple', salt);
    const b = await deriveKey('correct horse battery staple', salt);
    expect(toHex(a)).toBe(toHex(b));
  });

  it('derives different keys for different salts', async () => {
    const a = await deriveKey('password', generateSalt());
    const b = await deriveKey('password', generateSalt());
    expect(toHex(a)).not.toBe(toHex(b));
  });
});
