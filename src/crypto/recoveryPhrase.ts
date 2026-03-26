import * as bip39 from "bip39";

/** 24 words === 256 bits of entropy + checksum. */
export const RECOVERY_PHRASE_WORD_COUNT = 24;

/** libsodium secretbox key size derived from the first 32 bytes of the BIP39 seed. */
export const MNEMONIC_KEY_BYTES = 32;

/** BIP39 PBKDF2 produces a 64-byte seed; we only consume the leading 32 bytes as the symmetric key. */
export const BIP39_SEED_BYTES = 64;

function assertSeedLength(seed: Uint8Array): void {
  if (seed.length < MNEMONIC_KEY_BYTES) {
    throw new Error(`BIP39 seed shorter than expected (${seed.length})`);
  }
}

/**
 * Normalize mnemonic input: trim, lowercase, single spaces between words.
 * Call before validation/derivation so pasted phrases with odd whitespace still work.
 */
export function normalizeMnemonicPhrase(mnemonic: string): string {
  return mnemonic.trim().toLowerCase().split(/\s+/).join(" ");
}

/**
 * Generate a new 24-word BIP39 phrase (English wordlist).
 * The phrase encodes 256 bits of entropy; keep it offline and private.
 */
export function generateRecoveryPhrase(): string {
  return bip39.generateMnemonic(256);
}

/**
 * Returns true if the phrase is a valid BIP39 mnemonic (checksum ok, known words).
 */
export function isValidRecoveryPhrase(mnemonic: string): boolean {
  return bip39.validateMnemonic(normalizeMnemonicPhrase(mnemonic));
}

/**
 * Reconstruct the 32-byte symmetric key from a recovery phrase.
 *
 * Uses BIP39 {@link bip39.mnemonicToSeedSync} (PBKDF2-HMAC-SHA512, 2048 rounds) and
 * takes the first 32 bytes of the 64-byte seed.
 *
 * @param mnemonic - Space-separated BIP39 words (normalized internally).
 * @param bip39Passphrase - Optional BIP39 passphrase (“25th word”); empty string if none.
 * Changing this yields a different key — document this clearly for users.
 */
export function keyFromRecoveryPhrase(
  mnemonic: string,
  bip39Passphrase = "",
): Uint8Array {
  const normalized = normalizeMnemonicPhrase(mnemonic);
  if (!bip39.validateMnemonic(normalized)) {
    throw new Error("Invalid recovery phrase (checksum or unknown words)");
  }

  const seed = bip39.mnemonicToSeedSync(normalized, bip39Passphrase);
  assertSeedLength(seed);

  const key = new Uint8Array(MNEMONIC_KEY_BYTES);
  key.set(seed.subarray(0, MNEMONIC_KEY_BYTES), 0);
  return key;
}
