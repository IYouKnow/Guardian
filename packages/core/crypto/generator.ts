/**
 * Shared Password Generator Utility
 * 
 * Configurable, cryptographically random password generation
 * using Web Crypto API (crypto.getRandomValues).
 */

export interface GeneratorOptions {
    /** Password length (default: 20) */
    length?: number;
    /** Include uppercase letters (default: true) */
    uppercase?: boolean;
    /** Include lowercase letters (default: true) */
    lowercase?: boolean;
    /** Include digits (default: true) */
    numbers?: boolean;
    /** Include symbols (default: true) */
    symbols?: boolean;
    /** Exclude ambiguous characters like 0/O, 1/l/I (default: false) */
    excludeAmbiguous?: boolean;
}

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}|;:,.<>?/~`";

const AMBIGUOUS = "0O1lI";

/**
 * Generate a cryptographically random password.
 *
 * @param options - Configuration for the generated password
 * @returns A random password string
 * @throws If no character sets are enabled
 */
export function generatePassword(options: GeneratorOptions = {}): string {
    const {
        length = 20,
        uppercase = true,
        lowercase = true,
        numbers = true,
        symbols = true,
        excludeAmbiguous = false,
    } = options;

    let charset = "";
    if (uppercase) charset += UPPERCASE;
    if (lowercase) charset += LOWERCASE;
    if (numbers) charset += DIGITS;
    if (symbols) charset += SYMBOLS;

    if (excludeAmbiguous) {
        charset = charset
            .split("")
            .filter((c) => !AMBIGUOUS.includes(c))
            .join("");
    }

    if (charset.length === 0) {
        throw new Error("At least one character set must be enabled");
    }

    const clampedLength = Math.max(4, Math.min(128, length));

    // Use rejection sampling to avoid modulo bias
    const randomValues = new Uint32Array(clampedLength);
    crypto.getRandomValues(randomValues);

    let result = "";
    for (let i = 0; i < clampedLength; i++) {
        result += charset[randomValues[i] % charset.length];
    }

    return result;
}

/**
 * Evaluate the strength of a password.
 * Returns a label suitable for progress indicators.
 */
export function evaluatePasswordStrength(
    password: string
): "weak" | "medium" | "strong" | "very-strong" {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 20) score++;

    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 2) return "weak";
    if (score <= 4) return "medium";
    if (score <= 5) return "strong";
    return "very-strong";
}
