import argon2 from "argon2-browser";

/**
 * Output key length in bytes. Matches libsodium {@link crypto_secretbox_KEYBYTES}.
 */
export const ARGON2_DERIVED_KEY_LENGTH = 32;

/**
 * Minimum salt length (bytes). Argon2 RFC recommends 16+ random bytes for password hashing.
 */
export const ARGON2_MIN_SALT_BYTES = 16;

export type Argon2idParams = {
  /** Memory cost in KiB (e.g. 65536 = 64 MiB). */
  memoryKiB: number;
  /** Time cost (iterations). */
  iterations: number;
  /** Parallelism lanes (thread count hint). */
  parallelism: number;
  /** Derived key length in bytes. */
  hashLength: number;
};

/**
 * Default parameters aimed at offline attack resistance in a desktop browser.
 * Tune per device after UX testing (mobile may need lower {@link memoryKiB}).
 *
 * @see https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#argon2id
 */
export const DEFAULT_ARGON2ID_PARAMS: Argon2idParams = {
  memoryKiB: 64 * 1024,
  iterations: 3,
  parallelism: 4,
  hashLength: ARGON2_DERIVED_KEY_LENGTH,
};

function assertSalt(salt: Uint8Array): void {
  if (salt.length < ARGON2_MIN_SALT_BYTES) {
    throw new Error(
      `Argon2 salt must be at least ${ARGON2_MIN_SALT_BYTES} bytes (got ${salt.length})`,
    );
  }
}

/**
 * Normalize user-supplied passwords so the same Unicode string yields the same bytes
 * across NFC/NFD forms (e.g. composed vs decomposed accents).
 */
export function normalizePasswordForKdf(password: string): string {
  return password.normalize("NFKC");
}

/**
 * Derive a 32-byte key from a password using Argon2id.
 * The password is encoded as UTF-8 after NFKC normalization.
 *
 * Security: Callers MUST store the salt alongside ciphertext or account metadata;
 * never reuse salts across accounts. Prefer {@link generateArgon2Salt}.
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array,
  params: Argon2idParams = DEFAULT_ARGON2ID_PARAMS,
): Promise<Uint8Array> {
  if (!password) {
    throw new Error("Password must not be empty");
  }
  assertSalt(salt);
  if (params.hashLength !== ARGON2_DERIVED_KEY_LENGTH) {
    throw new Error(
      `hashLength must be ${ARGON2_DERIVED_KEY_LENGTH} for libsodium secretbox keys`,
    );
  }

  const normalized = normalizePasswordForKdf(password);
  const result = await argon2.hash({
    pass: normalized,
    salt,
    type: argon2.argon2id,
    hashLen: params.hashLength,
    mem: params.memoryKiB,
    time: params.iterations,
    parallelism: params.parallelism,
  });

  return result.hash;
}

/**
 * Generate a cryptographically random salt for Argon2.
 */
export function generateArgon2Salt(byteLength = ARGON2_MIN_SALT_BYTES): Uint8Array {
  if (byteLength < ARGON2_MIN_SALT_BYTES) {
    throw new Error(
      `Salt length must be at least ${ARGON2_MIN_SALT_BYTES} bytes (got ${byteLength})`,
    );
  }
  const salt = new Uint8Array(byteLength);
  crypto.getRandomValues(salt);
  return salt;
}
