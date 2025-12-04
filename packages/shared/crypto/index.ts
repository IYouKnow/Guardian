/**
 * Guardian Vault Cryptography
 * 
 * Provides encryption/decryption for vault files using:
 * - Argon2id for key derivation (2 seconds of work)
 * - ChaCha20-Poly1305 for encryption
 * 
 * All implementations use Web Crypto API (no external dependencies)
 */

export * from "./argon2";
export * from "./chacha20";
export * from "./vault";

