import { describe, expect, it } from "vitest";
import {
  DEFAULT_ARGON2ID_PARAMS,
  ARGON2_DERIVED_KEY_LENGTH,
  ARGON2_MIN_SALT_BYTES,
  deriveKeyFromPassword,
  generateArgon2Salt,
  normalizePasswordForKdf,
} from "./keyDerivation";

describe("keyDerivation", () => {
  it("deriveKeyFromPassword returns 32 bytes", async () => {
    const salt = generateArgon2Salt();
    const key = await deriveKeyFromPassword("correct horse battery staple", salt);
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(ARGON2_DERIVED_KEY_LENGTH);
  });

  it("same password and salt yield the same key", async () => {
    const salt = generateArgon2Salt();
    const a = await deriveKeyFromPassword("secret", salt);
    const b = await deriveKeyFromPassword("secret", salt);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it("different salt yields different key", async () => {
    const saltA = generateArgon2Salt();
    const saltB = generateArgon2Salt();
    const [ka, kb] = await Promise.all([
      deriveKeyFromPassword("same", saltA),
      deriveKeyFromPassword("same", saltB),
    ]);
    expect(Buffer.from(ka).equals(Buffer.from(kb))).toBe(false);
  });

  it("Unicode normalization is stable for composed vs decomposed", async () => {
    const salt = generateArgon2Salt();
    const composed = "caf\u00E9"; // é as single codepoint
    const decomposed = "caf\u0065\u0301"; // e + combining acute
    const [k1, k2] = await Promise.all([
      deriveKeyFromPassword(composed, salt),
      deriveKeyFromPassword(decomposed, salt),
    ]);
    expect(Buffer.from(k1).equals(Buffer.from(k2))).toBe(true);
  });

  it("normalizePasswordForKdf matches NFKC expectation", () => {
    expect(normalizePasswordForKdf("caf\u0065\u0301")).toBe(normalizePasswordForKdf("caf\u00E9"));
  });

  it("rejects empty password", async () => {
    const salt = generateArgon2Salt();
    await expect(deriveKeyFromPassword("", salt)).rejects.toThrow(/empty/i);
  });

  it("rejects salt shorter than minimum", async () => {
    const short = new Uint8Array(ARGON2_MIN_SALT_BYTES - 1);
    crypto.getRandomValues(short);
    await expect(deriveKeyFromPassword("x", short)).rejects.toThrow(/salt/i);
  });

  it("allows custom params when hashLength stays 32", async () => {
    const salt = generateArgon2Salt();
    const fast = {
      ...DEFAULT_ARGON2ID_PARAMS,
      memoryKiB: 8192,
      iterations: 1,
      parallelism: 1,
    };
    const key = await deriveKeyFromPassword("pw", salt, fast);
    expect(key.length).toBe(32);
  });
});
