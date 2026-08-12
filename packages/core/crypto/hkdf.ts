/**
 * Extracts a derived symmetric key using HKDF-SHA-256
 * Used to securely stretch Argon2 master keys into purpose-specific caching keys without losing entropy
 * 
 * @param ikm Initial Keying Material (e.g. Argon2 derived server key or file key)
 * @param infoString Purpose string to bind the key (defaults to "guardian-extension-local-cache")
 * @param salt Optional salt. Can be empty if IKM is already uniformly random (like Argon2 output)
 * @returns 32-byte derived symmetric key
 */
export async function deriveHKDF(
    ikm: Uint8Array,
    infoString: string = "guardian-extension-local-cache",
    salt: Uint8Array = new Uint8Array()
): Promise<Uint8Array> {
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        ikm as unknown as BufferSource,
        { name: "HKDF" },
        false,
        ["deriveBits"]
    );

    const info = new TextEncoder().encode(infoString);

    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: "HKDF",
            salt: salt as unknown as BufferSource,
            info: info,
            hash: "SHA-256",
        },
        keyMaterial,
        256 // 32 bytes = 256 bits
    );

    return new Uint8Array(derivedBits);
}
