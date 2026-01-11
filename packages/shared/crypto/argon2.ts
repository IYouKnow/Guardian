// Cache for the instantiated WASM module
let wasmModule: WebAssembly.Instance | null = null;
let wasmModulePromise: Promise<WebAssembly.Instance> | null = null;
let wasmBase64Cache: string | null = null;

// Flag to indicate if Argon2 is working
let argon2Available: boolean | null = null;

/**
 * Checks if in development mode
 * Compatible with browser and Node.js
 */


/**
 * Lists all exports from the WASM module (useful for debugging)
 */
function listWasmExports(instance: WebAssembly.Instance): string[] {
  return Object.keys(instance.exports);
}

/**
 * Cleans base64 content by removing PEM headers and line breaks
 */
function cleanBase64(content: string): string {
  // Remove PEM headers (-----BEGIN CERTIFICATE----- and -----END CERTIFICATE-----)
  let cleaned = content
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/-----BEGIN [A-Z ]+-----/g, '')
    .replace(/-----END [A-Z ]+-----/g, '');

  // Remove all line breaks and whitespace
  cleaned = cleaned.replace(/\s+/g, '');

  return cleaned.trim();
}

/**
 * Loads and instantiates the Argon2 WebAssembly module
 */
async function loadArgon2Module(): Promise<WebAssembly.Instance> {
  if (wasmModule) {
    return wasmModule;
  }

  if (wasmModulePromise) {
    return wasmModulePromise;
  }

  wasmModulePromise = (async () => {
    // Loads the argon2.b64.txt file if not already loaded
    if (!wasmBase64Cache) {
      try {
        // Uses import.meta.url to get the relative file path
        const wasmFilePath = new URL('./argon2.b64.txt', import.meta.url);
        const response = await fetch(wasmFilePath);
        if (!response.ok) {
          throw new Error(`Failed to load argon2.b64.txt: ${response.statusText}`);
        }
        const rawContent = await response.text();

        // Cleans the content by removing PEM headers and line breaks
        wasmBase64Cache = cleanBase64(rawContent);

        if (!wasmBase64Cache || wasmBase64Cache.length === 0) {
          throw new Error('argon2.b64.txt file is empty after cleaning.');
        }
      } catch (error) {
        throw new Error(
          `Failed to load argon2.b64.txt: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    // Decodes base64 to ArrayBuffer
    let binaryString: string;
    try {
      binaryString = atob(wasmBase64Cache);
    } catch (error) {
      throw new Error(
        'Failed to decode WASM base64. Check if the base64 string is correct.'
      );
    }
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Validates and compiles the WASM module
    const isValid = WebAssembly.validate(bytes.buffer);
    if (!isValid) {
      throw new Error('Invalid WASM module. The file may be corrupted or use an incompatible WebAssembly version.');
    }

    let module: WebAssembly.Module;
    try {
      module = await WebAssembly.compile(bytes.buffer);
    } catch (compileError) {
      const errorMsg = compileError instanceof Error ? compileError.message : String(compileError);
      throw new Error(`Failed to compile WASM module: ${errorMsg}. The file may be corrupted or in an incompatible format.`);
    }

    // Analyzes required imports
    const imports = WebAssembly.Module.imports(module);

    // Prepares imports based on what the module needs
    // Forces more memory in browsers that allow it
    const importObject: any = {
      env: {
        memory: new WebAssembly.Memory({
          initial: 512,      // 32 MiB initial
          maximum: 4096    // up to 256 MiB (more than enough)
        })
      },
      wasi_snapshot_preview1: {
        proc_exit: () => { },
        fd_write: () => 0,
        fd_close: () => 0,
        fd_seek: () => 0
      }
    };

    // Groups imports by module
    const importsByModule: Record<string, any> = {};
    for (const imp of imports) {
      if (!importsByModule[imp.module]) {
        importsByModule[imp.module] = {};
      }

      // Fills common imports
      if (imp.kind === 'memory') {
        if (!importsByModule[imp.module].memory) {
          // Forces custom memory
          importsByModule[imp.module].memory = new WebAssembly.Memory({
            initial: 512,  // 32 MiB initial
            maximum: 4096  // 256 MiB maximum
          });
        }
      } else if (imp.kind === 'table') {
        if (!importsByModule[imp.module].table) {
          importsByModule[imp.module].table = new WebAssembly.Table({
            initial: 0,
            element: 'anyfunc'
          });
        }
      } else if (imp.kind === 'function') {
        // Common Emscripten functions
        if (imp.name === 'abort' || imp.name === '_abort') {
          importsByModule[imp.module][imp.name] = () => { };
        } else if (imp.name.includes('memcpy') || imp.name.includes('memmove')) {
          importsByModule[imp.module][imp.name] = () => { };
        } else if (imp.name.includes('resize') || imp.name.includes('heap')) {
          importsByModule[imp.module][imp.name] = () => { };
        } else if (imp.name === '__memory_base' || imp.name === 'memoryBase') {
          importsByModule[imp.module][imp.name] = 0;
        } else if (imp.name === '__table_base' || imp.name === 'tableBase') {
          importsByModule[imp.module][imp.name] = 0;
        } else {
          // Generic function
          importsByModule[imp.module][imp.name] = () => { };
        }
      } else if (imp.kind === 'global') {
        importsByModule[imp.module][imp.name] = 0;
      }
    }

    // Adds modules to the import object
    if (Object.keys(importsByModule).length > 0) {
      for (const [moduleName, moduleImports] of Object.entries(importsByModule)) {
        importObject[moduleName] = moduleImports;
      }
    }

    // Instantiates the module
    let instance: WebAssembly.Instance;
    try {
      instance = await WebAssembly.instantiate(module, importObject);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // If it fails, tries without imports (standalone module)
      try {
        instance = await WebAssembly.instantiate(module, {});
      } catch (error2) {
        const errorMsg2 = error2 instanceof Error ? error2.message : String(error2);
        throw new Error(
          `Failed to instantiate WASM module. ` +
          `Error with imports: ${errorMsg}. ` +
          `Error without imports: ${errorMsg2}. ` +
          `The module may be in an incompatible format.`
        );
      }
    }

    wasmModule = instance;

    return wasmModule;
  })();

  return wasmModulePromise;
}

/**
 * Alternative implementation using Web Crypto API (PBKDF2) as fallback
 * 
 * This is a secure solution while the Argon2 WASM is not available.
 * 
 * Comparison:
 * - Argon2: Memory-hard, resistant to ASICs/GPUs, recommended by OWASP
 * - PBKDF2: Secure, widely supported, but not memory-hard
 * 
 * PBKDF2 is safe for production use, but Argon2 offers better protection
 * against attacks with specialized hardware. The number of iterations (100000) was
 * calibrated for approximately 2 seconds of work, similar to Argon2.
 */
async function deriveKeyFallback(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const passwordBytes = new TextEncoder().encode(password);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  // Iteration adjustment for approximately 2 seconds of work
  // This value should be calibrated based on the execution environment
  const iterations = 100000;

  // Creates a copy of the salt to ensure type compatibility
  const saltBuffer = new Uint8Array(salt).buffer;

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    256 // 32 bytes = 256 bits
  );

  // Ensures we have an ArrayBuffer
  const buffer = derivedBits instanceof ArrayBuffer
    ? derivedBits
    : new Uint8Array(derivedBits).buffer;

  return new Uint8Array(buffer);
}

/**
 * Internal helper function to derive a key with specific Argon2 parameters
 * Used for backward compatibility when trying different parameter sets
 * 
 * @param password - The master password
 * @param salt - Random salt of 16 bytes
 * @param memoryCost - Memory cost in KiB (must match encryption parameters)
 * @returns Derived key of 32 bytes
 */
async function deriveKeyWithParams(
  password: string,
  salt: Uint8Array,
  memoryCost: number
): Promise<Uint8Array> {
  if (salt.length !== 16) {
    throw new Error('Salt must be exactly 16 bytes');
  }

  // Tries to use Argon2 WASM
  try {
    const argon2 = await loadArgon2Module();
    const passwordBytes = new TextEncoder().encode(password);

    // Fixed parameters - MUST match encryption parameters
    // NOTE: WebAssembly does not support real threads, so parallelism must be 1
    const timeCost = 4; // 4 iterations - FIXED
    const parallelism = 1; // WASM does not support real threads - FIXED
    const hashLength = 32; // 32 bytes output - FIXED

    // Gets exported functions from WASM
    // Tries different common function names
    const memory = argon2.exports.memory as WebAssembly.Memory;

    // Tries different names for malloc/free
    const malloc = (argon2.exports.malloc ||
      argon2.exports._malloc ||
      (argon2.exports as any).__malloc) as ((size: number) => number) | undefined;

    const free = (argon2.exports.free ||
      argon2.exports._free ||
      (argon2.exports as any).__free) as ((ptr: number) => void) | undefined;

    // Tries different names for the Argon2id function
    const argon2id = (argon2.exports.argon2id_hash_raw ||
      argon2.exports.argon2id_hash ||
      argon2.exports.argon2id ||
      (argon2.exports as any)._argon2id_hash_raw ||
      (argon2.exports as any).__argon2id_hash_raw) as
      ((t_cost: number, m_cost: number, parallelism: number,
        pwd: number, pwdlen: number, salt: number, saltlen: number,
        hash: number, hashlen: number) => number) | undefined;

    if (!memory) {
      const exports = listWasmExports(argon2);
      throw new Error(`WASM memory not found. Available exports: ${exports.join(', ')}`);
    }

    if (!malloc) {
      const exports = listWasmExports(argon2);
      throw new Error(`malloc function not found. Available exports: ${exports.join(', ')}`);
    }

    if (!argon2id) {
      const exports = listWasmExports(argon2);
      throw new Error(`argon2id function not found. Available exports: ${exports.join(', ')}`);
    }

    // Ensure sufficient memory for fixed parameters
    // Argon2 needs approximately memoryCost * parallelism * 1024 bytes
    // Plus additional memory for buffers and overhead
    const requiredMemory = memoryCost * parallelism * 1024;
    const overheadMemory = 10 * 1024 * 1024; // 10 MiB overhead
    const totalRequiredMemory = requiredMemory + overheadMemory;
    const availableMemory = memory.buffer.byteLength;

    // Try to expand memory if needed, but DO NOT adjust memoryCost
    // memoryCost MUST remain fixed for key derivation consistency
    if (totalRequiredMemory > availableMemory) {
      // Calculate current pages as integer (floor to get complete pages)
      const currentPages = Math.floor(memory.buffer.byteLength / 65536);
      const memoryMaxPages = (memory as any).maximum || null;
      const maxPages = memoryMaxPages !== null ? Math.floor(memoryMaxPages) : null;

      // Calculate how many pages we need (ceil to ensure we have enough)
      const requiredPages = Math.ceil(totalRequiredMemory / 65536);

      // Calculate additional pages needed, ensuring it's an integer
      // Use ceil to ensure we don't under-allocate due to rounding
      const pagesNeeded = Math.ceil(requiredPages - currentPages);
      const additionalPages = maxPages !== null
        ? Math.max(0, Math.min(pagesNeeded, maxPages - currentPages))
        : Math.max(0, pagesNeeded);

      // Ensure additionalPages is an integer (should already be, but be explicit)
      const additionalPagesInt = Math.ceil(additionalPages);

      if (additionalPagesInt > 0) {
        try {
          memory.grow(additionalPagesInt);
        } catch (e) {
          // If we can't expand memory, throw an error
          // We cannot reduce memoryCost as it would break key derivation consistency
          throw new Error(
            `Insufficient memory for Argon2. Required: ${Math.ceil(totalRequiredMemory / 1024 / 1024)} MiB, ` +
            `Available: ${Math.floor(availableMemory / 1024 / 1024)} MiB. ` +
            `Cannot adjust parameters as they must remain fixed for key derivation consistency.`
          );
        }
      } else if (totalRequiredMemory > availableMemory) {
        // Cannot expand and don't have enough memory
        throw new Error(
          `Insufficient memory for Argon2. Required: ${Math.ceil(totalRequiredMemory / 1024 / 1024)} MiB, ` +
          `Available: ${Math.floor(availableMemory / 1024 / 1024)} MiB. ` +
          `Cannot adjust parameters as they must remain fixed for key derivation consistency.`
        );
      }
    }

    // Allocates memory for buffers
    const passwordPtr = malloc(passwordBytes.length);
    const saltPtr = malloc(salt.length);
    const hashPtr = malloc(hashLength);

    // Copies data to WASM memory
    const memoryBuffer = new Uint8Array(memory.buffer);
    memoryBuffer.set(passwordBytes, passwordPtr);
    memoryBuffer.set(salt, saltPtr);

    // Calls the Argon2id function
    const result = argon2id(
      timeCost,
      memoryCost,
      parallelism,
      passwordPtr,
      passwordBytes.length,
      saltPtr,
      salt.length,
      hashPtr,
      hashLength
    );

    if (result !== 0) {
      // Argon2 error code mapping
      const getErrorName = (code: number): string => {
        const errorMap: Record<number, string> = {
          [-1]: 'ARGON2_OUTPUT_PTR_NULL',
          [-2]: 'ARGON2_OUTPUT_TOO_SHORT',
          [-3]: 'ARGON2_OUTPUT_TOO_LONG',
          [-4]: 'ARGON2_PWD_TOO_SHORT',
          [-5]: 'ARGON2_PWD_TOO_LONG',
          [-6]: 'ARGON2_SALT_TOO_SHORT',
          [-7]: 'ARGON2_SALT_TOO_LONG',
          [-8]: 'ARGON2_AD_TOO_SHORT',
          [-9]: 'ARGON2_AD_TOO_LONG',
          [-10]: 'ARGON2_SECRET_TOO_SHORT',
          [-11]: 'ARGON2_SECRET_TOO_LONG',
          [-12]: 'ARGON2_TIME_TOO_SMALL',
          [-13]: 'ARGON2_TIME_TOO_LARGE',
          [-14]: 'ARGON2_MEMORY_TOO_LITTLE',
          [-15]: 'ARGON2_MEMORY_TOO_MUCH',
          [-16]: 'ARGON2_LANES_TOO_FEW',
          [-17]: 'ARGON2_LANES_TOO_MANY',
          [-18]: 'ARGON2_PWD_PTR_MISMATCH',
          [-19]: 'ARGON2_SALT_PTR_MISMATCH',
          [-20]: 'ARGON2_SECRET_PTR_MISMATCH',
          [-21]: 'ARGON2_AD_PTR_MISMATCH',
          [-22]: 'ARGON2_MEMORY_ALLOCATION_ERROR',
          [-23]: 'ARGON2_FREE_MEMORY_CBK_NULL',
          [-24]: 'ARGON2_ALLOCATE_MEMORY_CBK_NULL',
          [-25]: 'ARGON2_INCORRECT_PARAMETER',
          [-26]: 'ARGON2_INCORRECT_TYPE',
          [-27]: 'ARGON2_OUT_PTR_MISMATCH',
          [-28]: 'ARGON2_THREADS_TOO_FEW',
          [-29]: 'ARGON2_THREADS_TOO_MANY',
          [-30]: 'ARGON2_MISSING_ARGS',
          [-31]: 'ARGON2_ENCODING_FAIL',
          [-32]: 'ARGON2_DECODING_FAIL',
          [-33]: 'ARGON2_THREAD_FAIL',
          [-34]: 'ARGON2_DECODING_LENGTH_FAIL',
          [-35]: 'ARGON2_VERIFY_MISMATCH'
        };
        return errorMap[code] || 'UNKNOWN_ERROR';
      };

      const errorName = getErrorName(result);

      // Tries to free memory if free is available
      if (free) {
        free(passwordPtr);
        free(saltPtr);
        free(hashPtr);
      }
      throw new Error(`Argon2id failed with error code: ${result} (${errorName})`);
    }

    // Copies the resulting hash
    const hash = memoryBuffer.slice(hashPtr, hashPtr + hashLength);

    // Frees memory if free is available
    if (free) {
      free(passwordPtr);
      free(saltPtr);
      free(hashPtr);
    }

    // Marks Argon2 as available
    argon2Available = true;

    return hash;
  } catch (error) {
    // Re-throw error - let caller handle fallback
    throw error;
  }
}

/**
 * Derives a key from a password using Argon2id
 * 
 * Fixed configuration:
 * - Memory: 32 MiB (current standard)
 * - Iterations: 4
 * - Parallelism: 1
 * - Hash size: 32 bytes
 * 
 * @param password - The master password
 * @param salt - Random salt of 16 bytes
 * @returns Derived key of 32 bytes
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  // Use current standard parameters (32 MiB)
  const memoryCost = 32 * 1024; // 32 MiB - current standard

  try {
    return await deriveKeyWithParams(password, salt, memoryCost);
  } catch (error) {
    // Marks Argon2 as unavailable
    argon2Available = false;

    // Fallback to PBKDF2 if WASM fails
    const fallbackKey = await deriveKeyFallback(password, salt);
    return fallbackKey;
  }
}

/**
 * Derives a key using Argon2id with legacy 64 MiB parameters
 * Used for backward compatibility with vaults encrypted with older parameters
 * 
 * @param password - The master password
 * @param salt - Random salt of 16 bytes
 * @returns Derived key of 32 bytes
 */
export async function deriveKeyLegacy(password: string, salt: Uint8Array): Promise<Uint8Array> {
  // Use legacy parameters (64 MiB) for backward compatibility
  const memoryCost = 64 * 1024; // 64 MiB - legacy parameter

  try {
    return await deriveKeyWithParams(password, salt, memoryCost);
  } catch (error) {
    // If legacy Argon2 fails, don't fallback to PBKDF2 here
    // Let the caller handle the error (they may want to try PBKDF2 separately)
    throw error;
  }
}

/**
 * Generates a random salt of 16 bytes
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Checks if Argon2 is available and working
 * @returns true if Argon2 is available, false otherwise
 */
export async function isArgon2Available(): Promise<boolean> {
  if (argon2Available !== null) {
    return argon2Available;
  }

  // Tries to load the module to check availability
  try {
    const testPassword = 'test';
    const testSalt = generateSalt();
    await deriveKey(testPassword, testSalt);
    return argon2Available === true;
  } catch {
    return false;
  }
}

/**
 * Gets information about Argon2 status
 * Useful for debugging and diagnostics
 */
export async function getArgon2Status(): Promise<{
  available: boolean;
  wasmLoaded: boolean;
  exports?: string[];
}> {
  const available = await isArgon2Available();
  const wasmLoaded = wasmModule !== null;

  const result: {
    available: boolean;
    wasmLoaded: boolean;
    exports?: string[];
  } = {
    available,
    wasmLoaded
  };

  if (wasmModule) {
    result.exports = listWasmExports(wasmModule);
  }

  return result;
}
