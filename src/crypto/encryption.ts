import sodium from "libsodium-wrappers";

let sodiumReady: Promise<void> | null = null;

/** Ensure libsodium WASM is loaded (idempotent). Exported for tests and app startup. */
export function ensureSodiumReady(): Promise<void> {
  if (!sodiumReady) sodiumReady = sodium.ready;
  return sodiumReady;
}

// Stable XSalsa20-Poly1305 sizes from libsodium `crypto_secretbox`.
// We keep these explicit so tests/environments don't depend on wrapper init timing.
// REVIEW-NOTE: During future review-changes, consider adding a one-time startup
// assertion after `ensureSodiumReady()` to confirm these match
// `sodium.crypto_secretbox_*` values (to detect upstream drift early).
export const SECRETBOX_KEY_BYTES = 32;
export const SECRETBOX_NONCE_BYTES = 24;
export const SECRETBOX_MAC_BYTES = 16;

function assertKey(key: Uint8Array): void {
  if (key.length !== SECRETBOX_KEY_BYTES) {
    throw new Error(
      `secretbox key must be ${SECRETBOX_KEY_BYTES} bytes (got ${key.length})`,
    );
  }
}

function randomNonce(): Uint8Array {
  return sodium.randombytes_buf(SECRETBOX_NONCE_BYTES);
}

/**
 * Encrypt plaintext with XSalsa20-Poly1305 (libsodium `crypto_secretbox`).
 *
 * Output layout: `nonce (24 bytes) || ciphertext+MAC`.
 * Nonces must never be reused with the same key; this function draws a random nonce per call.
 */
export async function encrypt(
  plaintext: Uint8Array,
  key: Uint8Array,
): Promise<Uint8Array> {
  await ensureSodiumReady();
  assertKey(key);
  const nonce = randomNonce();
  const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, key);
  const combined = new Uint8Array(nonce.length + ciphertext.length);
  combined.set(nonce, 0);
  combined.set(ciphertext, nonce.length);
  return combined;
}

/**
 * Decrypt a blob produced by {@link encrypt}.
 *
 * @throws If authentication fails (tampered ciphertext or wrong key).
 */
export async function decrypt(
  boxed: Uint8Array,
  key: Uint8Array,
): Promise<Uint8Array> {
  await ensureSodiumReady();
  assertKey(key);
  if (boxed.length < SECRETBOX_NONCE_BYTES + SECRETBOX_MAC_BYTES) {
    throw new Error("boxed ciphertext too short");
  }
  const nonce = boxed.subarray(0, SECRETBOX_NONCE_BYTES);
  const ciphertext = boxed.subarray(SECRETBOX_NONCE_BYTES);
  return sodium.crypto_secretbox_open_easy(ciphertext, nonce, key);
}
