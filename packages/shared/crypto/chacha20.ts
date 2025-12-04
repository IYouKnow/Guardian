/**
 * ChaCha20-Poly1305 - Implementação pura em TypeScript
 * 
 * Implementação completa de ChaCha20-Poly1305 sem dependências externas.
 * Baseada no algoritmo padrão RFC 8439.
 * Compatível com Tauri, Capacitor e Web Extensions.
 */

// Constantes do ChaCha20
const CHACHA20_KEY_SIZE = 32; // 256 bits
const CHACHA20_NONCE_SIZE = 12; // 96 bits
const CHACHA20_BLOCK_SIZE = 64; // 512 bits
const POLY1305_TAG_SIZE = 16; // 128 bits

// Constantes do ChaCha20 (palavra "expand 32-byte k" em ASCII)
const CHACHA20_CONSTANTS = new Uint32Array([
  0x61707865, 0x3320646e, 0x79622d32, 0x6b206574
]);

/**
 * Rotaciona um valor de 32 bits para a esquerda
 */
function rotateLeft(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

/**
 * Adiciona dois valores de 32 bits com wraparound
 */
function add32(a: number, b: number): number {
  return (a + b) >>> 0;
}

/**
 * Inicializa o estado do ChaCha20
 */
function chacha20Init(key: Uint8Array, nonce: Uint8Array, counter: number): Uint32Array {
  const state = new Uint32Array(16);
  
  // Copia as constantes
  state.set(CHACHA20_CONSTANTS, 0);
  
  // Copia a chave (8 palavras de 32 bits)
  for (let i = 0; i < 8; i++) {
    state[i + 4] = (key[i * 4] | (key[i * 4 + 1] << 8) | (key[i * 4 + 2] << 16) | (key[i * 4 + 3] << 24)) >>> 0;
  }
  
  // Contador
  state[12] = counter >>> 0;
  
  // Nonce (3 palavras de 32 bits)
  for (let i = 0; i < 3; i++) {
    state[i + 13] = (nonce[i * 4] | (nonce[i * 4 + 1] << 8) | (nonce[i * 4 + 2] << 16) | (nonce[i * 4 + 3] << 24)) >>> 0;
  }
  
  return state;
}

/**
 * Realiza uma rodada quaternária do ChaCha20
 */
function chacha20QuarterRound(state: Uint32Array, a: number, b: number, c: number, d: number): void {
  state[a] = add32(state[a], state[b]);
  state[d] = rotateLeft(state[d] ^ state[a], 16);
  
  state[c] = add32(state[c], state[d]);
  state[b] = rotateLeft(state[b] ^ state[c], 12);
  
  state[a] = add32(state[a], state[b]);
  state[d] = rotateLeft(state[d] ^ state[a], 8);
  
  state[c] = add32(state[c], state[d]);
  state[b] = rotateLeft(state[b] ^ state[c], 7);
}

/**
 * Gera um bloco do ChaCha20
 */
function chacha20Block(state: Uint32Array): Uint8Array {
  const workingState = new Uint32Array(state);
  
  // 20 rodadas (10 duplas)
  for (let i = 0; i < 10; i++) {
    // Rodadas coluna
    chacha20QuarterRound(workingState, 0, 4, 8, 12);
    chacha20QuarterRound(workingState, 1, 5, 9, 13);
    chacha20QuarterRound(workingState, 2, 6, 10, 14);
    chacha20QuarterRound(workingState, 3, 7, 11, 15);
    
    // Rodadas diagonal
    chacha20QuarterRound(workingState, 0, 5, 10, 15);
    chacha20QuarterRound(workingState, 1, 6, 11, 12);
    chacha20QuarterRound(workingState, 2, 7, 8, 13);
    chacha20QuarterRound(workingState, 3, 4, 9, 14);
  }
  
  // Adiciona o estado original ao estado trabalhado
  const output = new Uint8Array(CHACHA20_BLOCK_SIZE);
  for (let i = 0; i < 16; i++) {
    const result = add32(workingState[i], state[i]);
    output[i * 4] = result & 0xff;
    output[i * 4 + 1] = (result >>> 8) & 0xff;
    output[i * 4 + 2] = (result >>> 16) & 0xff;
    output[i * 4 + 3] = (result >>> 24) & 0xff;
  }
  
  return output;
}

/**
 * Gera a chave do Poly1305 usando ChaCha20
 */
function poly1305KeyGen(key: Uint8Array, nonce: Uint8Array): Uint8Array {
  const zeroNonce = new Uint8Array(CHACHA20_NONCE_SIZE);
  const state = chacha20Init(key, zeroNonce, 0);
  const block = chacha20Block(state);
  return block.slice(0, 32);
}

/**
 * Implementação do Poly1305 MAC
 * Baseada no RFC 8439
 */
function poly1305(key: Uint8Array, data: Uint8Array): Uint8Array {
  // Clamp da chave r (primeiros 16 bytes)
  const r = new Uint8Array(16);
  r.set(key.slice(0, 16));
  r[3] &= 0x0f;
  r[4] &= 0xfc;
  r[7] &= 0x0f;
  r[8] &= 0xfc;
  r[11] &= 0x0f;
  r[12] &= 0xfc;
  r[15] &= 0x0f;
  
  // Converte r para números de 26 bits (little-endian)
  const r0 = r[0] | (r[1] << 8) | (r[2] << 16) | ((r[3] & 0x03) << 24);
  const r1 = (r[3] >>> 2) | (r[4] << 6) | (r[5] << 14) | ((r[6] & 0x0f) << 22);
  const r2 = (r[6] >>> 4) | (r[7] << 4) | (r[8] << 12) | ((r[9] & 0x3f) << 20);
  const r3 = (r[9] >>> 6) | (r[10] << 2) | (r[11] << 10) | (r[12] << 18);
  const r4 = r[13] | (r[14] << 8) | (r[15] << 16);
  
  // Inicializa o acumulador (5 palavras de 26 bits)
  let h0 = 0, h1 = 0, h2 = 0, h3 = 0, h4 = 0;
  
  // Processa os dados em blocos de 16 bytes
  const blockSize = 16;
  let offset = 0;
  
  while (offset < data.length) {
    const block = new Uint8Array(blockSize);
    const copyLen = Math.min(blockSize, data.length - offset);
    block.set(data.slice(offset, offset + copyLen));
    
    // Adiciona bit 1 ao final se não for o último bloco completo
    if (copyLen < blockSize) {
      block[copyLen] = 1;
    }
    
    // Converte o bloco para número (little-endian, 130 bits)
    const block0 = block[0] | (block[1] << 8) | (block[2] << 16) | ((block[3] & 0x03) << 24);
    const block1 = (block[3] >>> 2) | (block[4] << 6) | (block[5] << 14) | ((block[6] & 0x0f) << 22);
    const block2 = (block[6] >>> 4) | (block[7] << 4) | (block[8] << 12) | ((block[9] & 0x3f) << 20);
    const block3 = (block[9] >>> 6) | (block[10] << 2) | (block[11] << 10) | (block[12] << 18);
    const block4 = block[13] | (block[14] << 8) | (block[15] << 16);
    
    // h += block
    h0 = (h0 + block0) >>> 0;
    h1 = (h1 + block1) >>> 0;
    h2 = (h2 + block2) >>> 0;
    h3 = (h3 + block3) >>> 0;
    h4 = (h4 + block4) >>> 0;
    
    // h *= r (multiplicação modular)
    let d0 = (h0 * r0 + h1 * (r4 * 5) + h2 * (r3 * 5) + h3 * (r2 * 5) + h4 * (r1 * 5)) >>> 0;
    let d1 = (h0 * r1 + h1 * r0 + h2 * (r4 * 5) + h3 * (r3 * 5) + h4 * (r2 * 5)) >>> 0;
    let d2 = (h0 * r2 + h1 * r1 + h2 * r0 + h3 * (r4 * 5) + h4 * (r3 * 5)) >>> 0;
    let d3 = (h0 * r3 + h1 * r2 + h2 * r1 + h3 * r0 + h4 * (r4 * 5)) >>> 0;
    let d4 = (h0 * r4 + h1 * r3 + h2 * r2 + h3 * r1 + h4 * r0) >>> 0;
    
    // Reduz módulo 2^130 - 5
    let carry = d0 >>> 26;
    h0 = d0 & 0x3ffffff;
    d1 += carry;
    carry = d1 >>> 26;
    h1 = d1 & 0x3ffffff;
    d2 += carry;
    carry = d2 >>> 26;
    h2 = d2 & 0x3ffffff;
    d3 += carry;
    carry = d3 >>> 26;
    h3 = d3 & 0x3ffffff;
    d4 += carry;
    carry = d4 >>> 26;
    h4 = d4 & 0x3ffffff;
    h0 += carry * 5;
    carry = h0 >>> 26;
    h0 &= 0x3ffffff;
    h1 += carry;
    
    offset += blockSize;
  }
  
  // Redução final
  carry = h1 >>> 26;
  h1 &= 0x3ffffff;
  h2 += carry;
  carry = h2 >>> 26;
  h2 &= 0x3ffffff;
  h3 += carry;
  carry = h3 >>> 26;
  h3 &= 0x3ffffff;
  h4 += carry;
  carry = h4 >>> 26;
  h4 &= 0x3ffffff;
  h0 += carry * 5;
  carry = h0 >>> 26;
  h0 &= 0x3ffffff;
  h1 += carry;
  
  // Aplica redução final se necessário (h >= 2^130 - 5)
  const g0 = h0 + 5;
  carry = g0 >>> 26;
  const g1 = h1 + carry;
  carry = g1 >>> 26;
  const g2 = h2 + carry;
  carry = g2 >>> 26;
  const g3 = h3 + carry;
  carry = g3 >>> 26;
  const g4 = (h4 + carry) & 0x3ffffff;
  
  const mask = (-(carry >>> 0)) >>> 0;
  h0 = (h0 & ~mask) | (g0 & mask);
  h1 = (h1 & ~mask) | (g1 & mask);
  h2 = (h2 & ~mask) | (g2 & mask);
  h3 = (h3 & ~mask) | (g3 & mask);
  h4 = (h4 & ~mask) | (g4 & mask);
  
  // h += s (segunda metade da chave, 16 bytes)
  const s = new Uint8Array(16);
  s.set(key.slice(16, 32));
  const s0 = s[0] | (s[1] << 8) | (s[2] << 16) | (s[3] << 24);
  const s1 = s[4] | (s[5] << 8) | (s[6] << 16) | (s[7] << 24);
  const s2 = s[8] | (s[9] << 8) | (s[10] << 16) | (s[11] << 24);
  const s3 = s[12] | (s[13] << 8) | (s[14] << 16) | (s[15] << 24);
  
  let t0 = (h0 + (s0 & 0x3ffffff)) >>> 0;
  let t1 = (h1 + (s1 & 0x3ffffff) + (t0 >>> 26)) >>> 0;
  let t2 = (h2 + (s2 & 0x3ffffff) + (t1 >>> 26)) >>> 0;
  let t3 = (h3 + (s3 & 0x3ffffff) + (t2 >>> 26)) >>> 0;
  let t4 = (h4 + (t3 >>> 26)) >>> 0;
  
  // Converte para bytes (little-endian, 16 bytes)
  const tag = new Uint8Array(POLY1305_TAG_SIZE);
  t0 &= 0x3ffffff;
  t1 &= 0x3ffffff;
  t2 &= 0x3ffffff;
  t3 &= 0x3ffffff;
  t4 &= 0x3ffffff;
  
  tag[0] = t0 & 0xff;
  tag[1] = (t0 >>> 8) & 0xff;
  tag[2] = (t0 >>> 16) & 0xff;
  tag[3] = (t0 >>> 24) & 0xff;
  tag[4] = t1 & 0xff;
  tag[5] = (t1 >>> 8) & 0xff;
  tag[6] = (t1 >>> 16) & 0xff;
  tag[7] = (t1 >>> 24) & 0xff;
  tag[8] = t2 & 0xff;
  tag[9] = (t2 >>> 8) & 0xff;
  tag[10] = (t2 >>> 16) & 0xff;
  tag[11] = (t2 >>> 24) & 0xff;
  tag[12] = t3 & 0xff;
  tag[13] = (t3 >>> 8) & 0xff;
  tag[14] = (t3 >>> 16) & 0xff;
  tag[15] = (t3 >>> 24) & 0xff;
  
  return tag;
}

/**
 * Comparação em tempo constante para evitar timing attacks
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Encripta dados usando ChaCha20-Poly1305
 * @param key - Chave de 32 bytes
 * @param nonce - Nonce de 12 bytes
 * @param plaintext - Dados para encriptar
 * @returns Ciphertext + tag Poly1305 (16 bytes) concatenados
 */
export async function encrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  plaintext: Uint8Array
): Promise<Uint8Array> {
  if (key.length !== CHACHA20_KEY_SIZE) {
    throw new Error('A chave deve ter 32 bytes');
  }
  if (nonce.length !== CHACHA20_NONCE_SIZE) {
    throw new Error('O nonce deve ter 12 bytes');
  }
  
  // Gera a chave do Poly1305
  const polyKey = poly1305KeyGen(key, nonce);
  
  // Encripta o plaintext com ChaCha20
  const state = chacha20Init(key, nonce, 1);
  const ciphertext = new Uint8Array(plaintext.length);
  
  let offset = 0;
  let blockCounter = 1;
  
  while (offset < plaintext.length) {
    const currentState = chacha20Init(key, nonce, blockCounter);
    const block = chacha20Block(currentState);
    
    const blockSize = Math.min(CHACHA20_BLOCK_SIZE, plaintext.length - offset);
    for (let i = 0; i < blockSize; i++) {
      ciphertext[offset + i] = plaintext[offset + i] ^ block[i];
    }
    
    offset += blockSize;
    blockCounter++;
  }
  
  // Calcula a tag Poly1305
  const tag = poly1305(polyKey, ciphertext);
  
  // Retorna ciphertext + tag
  const result = new Uint8Array(ciphertext.length + POLY1305_TAG_SIZE);
  result.set(ciphertext, 0);
  result.set(tag, ciphertext.length);
  
  return result;
}

/**
 * Desencripta dados usando ChaCha20-Poly1305
 * @param key - Chave de 32 bytes
 * @param nonce - Nonce de 12 bytes
 * @param ciphertext - Ciphertext + tag (16 bytes) concatenados
 * @returns Plaintext desencriptado
 */
export async function decrypt(
  key: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array
): Promise<Uint8Array> {
  if (key.length !== CHACHA20_KEY_SIZE) {
    throw new Error('A chave deve ter 32 bytes');
  }
  if (nonce.length !== CHACHA20_NONCE_SIZE) {
    throw new Error('O nonce deve ter 12 bytes');
  }
  if (ciphertext.length < POLY1305_TAG_SIZE) {
    throw new Error('O ciphertext é muito curto');
  }
  
  // Separa o ciphertext da tag
  const tag = ciphertext.slice(ciphertext.length - POLY1305_TAG_SIZE);
  const encryptedData = ciphertext.slice(0, ciphertext.length - POLY1305_TAG_SIZE);
  
  // Gera a chave do Poly1305
  const polyKey = poly1305KeyGen(key, nonce);
  
  // Verifica a tag
  const expectedTag = poly1305(polyKey, encryptedData);
  if (!constantTimeEqual(tag, expectedTag)) {
    throw new Error('Falha na autenticação: tag inválida');
  }
  
  // Desencripta com ChaCha20
  const plaintext = new Uint8Array(encryptedData.length);
  
  let offset = 0;
  let blockCounter = 1;
  
  while (offset < encryptedData.length) {
    const currentState = chacha20Init(key, nonce, blockCounter);
    const block = chacha20Block(currentState);
    
    const blockSize = Math.min(CHACHA20_BLOCK_SIZE, encryptedData.length - offset);
    for (let i = 0; i < blockSize; i++) {
      plaintext[offset + i] = encryptedData[offset + i] ^ block[i];
    }
    
    offset += blockSize;
    blockCounter++;
  }
  
  return plaintext;
}

/**
 * Gera um nonce aleatório
 */
export function generateNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(CHACHA20_NONCE_SIZE));
}
