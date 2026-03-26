import { describe, expect, it } from "vitest";
import * as bip39 from "bip39";
import {
  generateRecoveryPhrase,
  isValidRecoveryPhrase,
  keyFromRecoveryPhrase,
  MNEMONIC_KEY_BYTES,
  normalizeMnemonicPhrase,
  RECOVERY_PHRASE_WORD_COUNT,
} from "./recoveryPhrase";

describe("recoveryPhrase", () => {
  it("generateRecoveryPhrase returns 24 English words", () => {
    const phrase = generateRecoveryPhrase();
    const words = phrase.split(" ");
    expect(words.length).toBe(RECOVERY_PHRASE_WORD_COUNT);
    expect(bip39.validateMnemonic(phrase)).toBe(true);
  });

  it("normalizeMnemonicPhrase trims and collapses whitespace", () => {
    const raw = "  abandon  abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art \n";
    const norm = normalizeMnemonicPhrase(raw);
    expect(norm.split(" ").length).toBe(24);
    expect(isValidRecoveryPhrase(raw)).toBe(true);
  });

  it("keyFromRecoveryPhrase is deterministic for fixed mnemonic", () => {
    const mnemonic = bip39.generateMnemonic(256);
    const a = keyFromRecoveryPhrase(mnemonic);
    const b = keyFromRecoveryPhrase(mnemonic);
    expect(a.length).toBe(MNEMONIC_KEY_BYTES);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it("optional BIP39 passphrase changes derived key", () => {
    const mnemonic = bip39.generateMnemonic(256);
    const without = keyFromRecoveryPhrase(mnemonic, "");
    const withPass = keyFromRecoveryPhrase(mnemonic, "user-secret");
    expect(Buffer.from(without).equals(Buffer.from(withPass))).toBe(false);
  });

  it("throws on invalid checksum", () => {
    const bad =
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon wrong";
    expect(() => keyFromRecoveryPhrase(bad)).toThrow(/invalid/i);
  });

  it("throws on unknown word", () => {
    const words = bip39.generateMnemonic(256).split(" ");
    words[0] = "zznotawordzz";
    expect(() => keyFromRecoveryPhrase(words.join(" "))).toThrow();
  });
});
