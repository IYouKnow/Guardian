import { describe, it, expect } from 'vitest';
import { chacha20poly1305 } from '@noble/ciphers/chacha.js';
import {
  encrypt,
  decrypt,
  decryptLegacy,
  packBlob,
  unpackBlob,
  isLegacyBlob,
  generateNonce,
} from './chacha20';

const hex = (s: string): Uint8Array =>
  Uint8Array.from(s.match(/../g)!.map((b) => parseInt(b, 16)));

const toHex = (b: Uint8Array): string =>
  Array.from(b).map((x) => x.toString(16).padStart(2, '0')).join('');

const randomKey = (): Uint8Array => crypto.getRandomValues(new Uint8Array(32));

// RFC 8439 §2.8.2 test vector
const AEAD_KEY = hex(
  '808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f'
);
const AEAD_NONCE = hex('070000004041424344454647');
const AEAD_AAD = hex('50515253c0c1c2c3c4c5c6c7');
const AEAD_PLAINTEXT = new TextEncoder().encode(
  "Ladies and Gentlemen of the class of '99: If I could offer you only one tip for the future, sunscreen would be it."
);
const AEAD_CIPHERTEXT = hex(
  'd31a8d34648e60db7b86afbc53ef7ec2' +
    'a4aded51296e08fea9e2b5a736ee62d6' +
    '3dbea45e8ca9671282fafb69da92728b' +
    '1a71de0a9e060b2905d6a5b67ecd3b36' +
    '92ddbd7f2d778b8c9803aee328091b58' +
    'fab324e4fad675945585808b4831d7bc' +
    '3ff4def08e4b7a9de576d26586cec64b' +
    '6116'
);
const AEAD_TAG = hex('1ae10b594f09e26a7e902ecbd0600691');

describe('ChaCha20-Poly1305 AEAD', () => {
  it('matches the RFC 8439 §2.8.2 known-answer vector', () => {
    const out = chacha20poly1305(AEAD_KEY, AEAD_NONCE, AEAD_AAD).encrypt(
      AEAD_PLAINTEXT
    );
    const ciphertext = out.subarray(0, out.length - 16);
    const tag = out.subarray(out.length - 16);

    expect(toHex(ciphertext)).toBe(toHex(AEAD_CIPHERTEXT));
    expect(toHex(tag)).toBe(toHex(AEAD_TAG));
  });

  it('wrapper produces the same output as the underlying AEAD', async () => {
    const plaintext = new TextEncoder().encode('hello guardian');
    const nonce = hex('000102030405060708090a0b');

    const ours = await encrypt(AEAD_KEY, nonce, plaintext);
    const reference = chacha20poly1305(AEAD_KEY, nonce).encrypt(plaintext);

    expect(toHex(ours)).toBe(toHex(reference));
  });

  it('round-trips plaintext through encrypt/decrypt', async () => {
    const key = randomKey();
    const nonce = generateNonce();
    const plaintext = new TextEncoder().encode('a'.repeat(500));

    const ciphertext = await encrypt(key, nonce, plaintext);
    const recovered = await decrypt(key, nonce, ciphertext);

    expect(toHex(recovered)).toBe(toHex(plaintext));
  });

  it('rejects tampered ciphertext', async () => {
    const key = randomKey();
    const nonce = generateNonce();
    const ciphertext = await encrypt(key, nonce, new TextEncoder().encode('secret'));

    ciphertext[ciphertext.length - 1] ^= 0x01;

    await expect(decrypt(key, nonce, ciphertext)).rejects.toThrow();
  });

  it('rejects the wrong key', async () => {
    const key = randomKey();
    const otherKey = randomKey();
    const nonce = generateNonce();
    const ciphertext = await encrypt(key, nonce, new TextEncoder().encode('secret'));

    await expect(decrypt(otherKey, nonce, ciphertext)).rejects.toThrow();
  });
});

describe('per-item blob wire format', () => {
  const key = hex('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f');

  it('round-trips through packBlob/unpackBlob and is not legacy', async () => {
    const plaintext = new TextEncoder().encode(JSON.stringify({ id: 'x', password: 'p' }));
    const blob = await packBlob(key, plaintext);

    expect(isLegacyBlob(blob)).toBe(false);
    expect(await unpackBlob(key, blob)).toEqual(plaintext);
  });

  it('recovers a legacy blob (nonce || ciphertext || broken tag)', async () => {
    const plaintext = new TextEncoder().encode('legacy payload');
    const nonce = generateNonce();

    // Legacy ciphertext is identical to the current stream output; only the
    // (worthless) 16-byte tag differed. Build a legacy blob by hand.
    const current = await encrypt(key, nonce, plaintext);
    const ciphertext = current.subarray(0, current.length - 16);
    const brokenTag = new Uint8Array(16).fill(0xab);

    const legacyBlob = new Uint8Array(nonce.length + ciphertext.length + brokenTag.length);
    legacyBlob.set(nonce, 0);
    legacyBlob.set(ciphertext, nonce.length);
    legacyBlob.set(brokenTag, nonce.length + ciphertext.length);

    expect(isLegacyBlob(legacyBlob)).toBe(true);
    expect(await unpackBlob(key, legacyBlob)).toEqual(plaintext);
    expect(decryptLegacy(key, nonce, legacyBlob.subarray(nonce.length))).toEqual(plaintext);
  });
});
