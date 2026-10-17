/**
 * Guardian Vault Cryptography
 * 
 * Provides encryption/decryption for vault files using:
 * - Argon2id for key derivation (64 MiB / t=4 / p=1)
 * - ChaCha20-Poly1305 for encryption
 * 
 * Key derivation uses the Web Crypto API / Argon2 WASM; the AEAD uses the
 * audited @noble/ciphers library.
 */

export * from "./argon2";
export * from "./chacha20";
export * from "./vault";
export * from "./generator";

// Exports Argon2 diagnostic functions
export { isArgon2Available, getArgon2Status } from "./argon2";

