/**
 * ChaCha20-Poly1305 (RFC 8439) and XChaCha20-Poly1305 AEAD
 *
 * Both AEADs use the audited @noble/ciphers implementation. XChaCha's 192-bit
 * nonce is used on paths that reuse a long-lived key (the .guardian vault
 * format and the per-item server-sync blobs), where random 96-bit nonces would
 * otherwise be collision-prone.
 *
 * A private, legacy raw-ChaCha20 routine is retained solely to RECOVER data
 * written by an older build whose Poly1305 tag was broken (it truncated 26-bit
 * limb products and omitted the RFC 8439 length block). That old "tag" provided
 * no authentication, so the recovery path deliberately ignores it. It is only
 * ever used to read v1 data, which is then re-encrypted under the real AEAD.
 */

import { chacha20poly1305, xchacha20poly1305 } from "@noble/ciphers/chacha.js";

const CHACHA20_KEY_SIZE = 32; // 256 bits
const CHACHA20_NONCE_SIZE = 12; // 96 bits
const XCHACHA20_NONCE_SIZE = 24; // 192 bits
const CHACHA20_BLOCK_SIZE = 64; // 512 bits
export const POLY1305_TAG_SIZE = 16; // 128 bits

// First byte of the per-item wire format produced by packBlob().
// v2 = ChaCha20-Poly1305 (12-byte nonce), v3 = XChaCha20-Poly1305 (24-byte nonce).
// v3 is the current format; v2 is still readable.
export const BLOB_FORMAT_V2 = 0x02;
export const BLOB_FORMAT_V3 = 0x03;

function assertKeyNonce(key: Uint8Array, nonce: Uint8Array): void {
  if (key.length !== CHACHA20_KEY_SIZE) {
    throw new Error("Key must be 32 bytes");
  }
  if (nonce.length !== CHACHA20_NONCE_SIZE) {
    throw new Error("Nonce must be 12 bytes");
  }
}

function assertKeyNonceX(key: Uint8Array, nonce: Uint8Array): void {
  if (key.length !== CHACHA20_KEY_SIZE) {
    throw new Error("Key must be 32 bytes");
  }
  if (nonce.length !== XCHACHA20_NONCE_SIZE) {
    throw new Error("Nonce must be 24 bytes");
  }
}

/**
 * Encrypts data using ChaCha20-Poly1305 (RFC 8439)
 * @param key - 32-byte key
 * @param nonce - 12-byte nonce
 * @param plaintext - Data to encrypt
 * @returns Ciphertext + Poly1305 tag (16 bytes) concatenated
 */
export async function encrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array
): Promise<Uint8Array> {
  assertKeyNonce(key, nonce);
  return chacha20poly1305(key, nonce).encrypt(plaintext);
}

/**
 * Decrypts data using ChaCha20-Poly1305 (RFC 8439)
 * @param key - 32-byte key
 * @param nonce - 12-byte nonce
 * @param ciphertext - Ciphertext + tag (16 bytes) concatenated
 * @returns Decrypted plaintext
 * @throws if the authentication tag does not verify
 */
export async function decrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array
): Promise<Uint8Array> {
  assertKeyNonce(key, nonce);
  if (ciphertext.length < POLY1305_TAG_SIZE) {
    throw new Error("Ciphertext is too short");
  }
  return chacha20poly1305(key, nonce).decrypt(ciphertext);
}

/**
 * Generates a random nonce
 */
export function generateNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(CHACHA20_NONCE_SIZE));
}

/**
 * Encrypts data using XChaCha20-Poly1305 (24-byte extended nonce).
 *
 * Unlike ChaCha20-Poly1305, XChaCha's 192-bit nonce is safe to generate
 * randomly even under a long-lived fixed key.
 *
 * @param key - 32-byte key
 * @param nonce - 24-byte nonce
 * @param plaintext - Data to encrypt
 * @returns Ciphertext + Poly1305 tag (16 bytes) concatenated
 */
export async function encryptXChaCha(
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array
): Promise<Uint8Array> {
  assertKeyNonceX(key, nonce);
  return xchacha20poly1305(key, nonce).encrypt(plaintext);
}

/**
 * Decrypts data using XChaCha20-Poly1305 (24-byte extended nonce).
 *
 * @param key - 32-byte key
 * @param nonce - 24-byte nonce
 * @param ciphertext - Ciphertext + tag (16 bytes) concatenated
 * @returns Decrypted plaintext
 * @throws if the authentication tag does not verify
 */
export async function decryptXChaCha(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array
): Promise<Uint8Array> {
  assertKeyNonceX(key, nonce);
  if (ciphertext.length < POLY1305_TAG_SIZE) {
    throw new Error("Ciphertext is too short");
  }
  return xchacha20poly1305(key, nonce).decrypt(ciphertext);
}

/**
 * Generates a random 24-byte XChaCha20 nonce
 */
export function generateXNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(XCHACHA20_NONCE_SIZE));
}

// --- V1 recovery (legacy, broken-tag format) --------------------------------
// The ChaCha20 stream cipher below was already RFC-correct in the old build;
// only the tag was broken. These primitives exist purely to recover old data.

const LEGACY_CONSTANTS = new Uint32Array([
  0x61707865, 0x3320646e, 0x79622d32, 0x6b206574,
]);

function legacyRotateLeft(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function legacyAdd32(a: number, b: number): number {
  return (a + b) >>> 0;
}

function legacyInit(key: Uint8Array, nonce: Uint8Array, counter: number): Uint32Array {
  const state = new Uint32Array(16);
  state.set(LEGACY_CONSTANTS, 0);

  for (let i = 0; i < 8; i++) {
    state[i + 4] = (key[i * 4] | (key[i * 4 + 1] << 8) | (key[i * 4 + 2] << 16) | (key[i * 4 + 3] << 24)) >>> 0;
  }

  state[12] = counter >>> 0;

  for (let i = 0; i < 3; i++) {
    state[i + 13] = (nonce[i * 4] | (nonce[i * 4 + 1] << 8) | (nonce[i * 4 + 2] << 16) | (nonce[i * 4 + 3] << 24)) >>> 0;
  }

  return state;
}

function legacyQuarterRound(state: Uint32Array, a: number, b: number, c: number, d: number): void {
  state[a] = legacyAdd32(state[a], state[b]);
  state[d] = legacyRotateLeft(state[d] ^ state[a], 16);

  state[c] = legacyAdd32(state[c], state[d]);
  state[b] = legacyRotateLeft(state[b] ^ state[c], 12);

  state[a] = legacyAdd32(state[a], state[b]);
  state[d] = legacyRotateLeft(state[d] ^ state[a], 8);

  state[c] = legacyAdd32(state[c], state[d]);
  state[b] = legacyRotateLeft(state[b] ^ state[c], 7);
}

function legacyBlock(state: Uint32Array): Uint8Array {
  const workingState = new Uint32Array(state);

  for (let i = 0; i < 10; i++) {
    legacyQuarterRound(workingState, 0, 4, 8, 12);
    legacyQuarterRound(workingState, 1, 5, 9, 13);
    legacyQuarterRound(workingState, 2, 6, 10, 14);
    legacyQuarterRound(workingState, 3, 7, 11, 15);

    legacyQuarterRound(workingState, 0, 5, 10, 15);
    legacyQuarterRound(workingState, 1, 6, 11, 12);
    legacyQuarterRound(workingState, 2, 7, 8, 13);
    legacyQuarterRound(workingState, 3, 4, 9, 14);
  }

  const output = new Uint8Array(CHACHA20_BLOCK_SIZE);
  for (let i = 0; i < 16; i++) {
    const result = legacyAdd32(workingState[i], state[i]);
    output[i * 4] = result & 0xff;
    output[i * 4 + 1] = (result >>> 8) & 0xff;
    output[i * 4 + 2] = (result >>> 16) & 0xff;
    output[i * 4 + 3] = (result >>> 24) & 0xff;
  }

  return output;
}

function legacyChaCha20Xor(key: Uint8Array, nonce: Uint8Array, data: Uint8Array): Uint8Array {
  const output = new Uint8Array(data.length);

  let offset = 0;
  let blockCounter = 1; // matches the legacy encrypt(): payload starts at counter 1

  while (offset < data.length) {
    const block = legacyBlock(legacyInit(key, nonce, blockCounter));

    const blockSize = Math.min(CHACHA20_BLOCK_SIZE, data.length - offset);
    for (let i = 0; i < blockSize; i++) {
      output[offset + i] = data[offset + i] ^ block[i];
    }

    offset += blockSize;
    blockCounter++;
  }

  return output;
}

/**
 * Recovery-only: decrypts data produced by the old build's broken-tag format.
 *
 * The old "tag" was not a valid Poly1305 MAC and provided no authentication,
 * so it is discarded and the (RFC-correct) ChaCha20 stream is applied directly.
 * Only use this to read v1 data; re-encrypt with encrypt() afterwards.
 *
 * @param key - 32-byte key
 * @param nonce - 12-byte nonce
 * @param ciphertextWithTag - Ciphertext followed by the 16-byte legacy tag
 * @returns Decrypted plaintext
 */
export function decryptLegacy(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertextWithTag: Uint8Array
): Uint8Array {
  assertKeyNonce(key, nonce);
  if (ciphertextWithTag.length < POLY1305_TAG_SIZE) {
    throw new Error("Ciphertext is too short");
  }
  const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - POLY1305_TAG_SIZE);
  return legacyChaCha20Xor(key, nonce, ciphertext);
}

// --- Per-item wire format ---------------------------------------------------
// v3 (current): [0x03][nonce 24][ciphertext + 16-byte tag]   (XChaCha20-Poly1305)
// v2 (legacy):  [0x02][nonce 12][ciphertext + 16-byte tag]   (ChaCha20-Poly1305)
// v1 (legacy):  [nonce 12][ciphertext + broken tag 16]       (unmarked, unauthenticated)

/**
 * Encrypts a payload into the current per-item wire format (v3).
 */
export async function packBlob(key: Uint8Array, plaintext: Uint8Array): Promise<Uint8Array> {
  const nonce = generateXNonce();
  const ciphertext = await encryptXChaCha(key, nonce, plaintext);

  const packed = new Uint8Array(1 + XCHACHA20_NONCE_SIZE + ciphertext.length);
  packed[0] = BLOB_FORMAT_V3;
  packed.set(nonce, 1);
  packed.set(ciphertext, 1 + XCHACHA20_NONCE_SIZE);

  return packed;
}

/**
 * Decrypts a per-item blob, transparently reading the current (v3) format and
 * recovering the legacy v2 (12-byte nonce) and v1 (unmarked, broken tag)
 * formats. Callers should check `isLegacyBlob()` to know whether a recovered
 * item needs to be re-uploaded in the current format.
 */
export async function unpackBlob(key: Uint8Array, blob: Uint8Array): Promise<Uint8Array> {
  if (blob.length > 0 && blob[0] === BLOB_FORMAT_V3) {
    return decryptXChaCha(
      key,
      blob.subarray(1, 1 + XCHACHA20_NONCE_SIZE),
      blob.subarray(1 + XCHACHA20_NONCE_SIZE)
    );
  }

  if (blob.length > 0 && blob[0] === BLOB_FORMAT_V2) {
    return decrypt(key, blob.subarray(1, 1 + CHACHA20_NONCE_SIZE), blob.subarray(1 + CHACHA20_NONCE_SIZE));
  }

  // Legacy v1: [nonce 12][ciphertext + broken tag 16]
  if (blob.length < CHACHA20_NONCE_SIZE + POLY1305_TAG_SIZE) {
    throw new Error("Encrypted blob is too short");
  }
  return decryptLegacy(key, blob.subarray(0, CHACHA20_NONCE_SIZE), blob.subarray(CHACHA20_NONCE_SIZE));
}

/**
 * Returns true if the blob is not in the current (v3) format, i.e. it is a
 * legacy v1 or v2 blob that should be re-encrypted on the next save.
 */
export function isLegacyBlob(blob: Uint8Array): boolean {
  return !(blob.length > 0 && blob[0] === BLOB_FORMAT_V3);
}
