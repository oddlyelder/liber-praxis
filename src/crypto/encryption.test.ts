import { describe, expect, it } from "vitest";
import {
  decrypt,
  encrypt,
  ensureSodiumReady,
  SECRETBOX_KEY_BYTES,
  SECRETBOX_MAC_BYTES,
  SECRETBOX_NONCE_BYTES,
} from "./encryption";

async function randomKey(): Promise<Uint8Array> {
  await ensureSodiumReady();
  const k = new Uint8Array(SECRETBOX_KEY_BYTES);
  crypto.getRandomValues(k);
  return k;
}

describe("encryption", () => {
  it("round-trips UTF-8 plaintext", async () => {
    const key = await randomKey();
    const plaintext = new TextEncoder().encode("Patient note — äöü 🔒");
    const boxed = await encrypt(plaintext, key);
    const roundTrip = await decrypt(boxed, key);
    expect(new TextDecoder().decode(roundTrip)).toBe(
      new TextDecoder().decode(plaintext),
    );
  });

  it("prepends nonce of correct length", async () => {
    const key = await randomKey();
    const boxed = await encrypt(new Uint8Array([1, 2, 3]), key);
    expect(boxed.length).toBe(SECRETBOX_NONCE_BYTES + SECRETBOX_MAC_BYTES + 3);
  });

  it("fails decryption with wrong key", async () => {
    const key = await randomKey();
    const other = await randomKey();
    const boxed = await encrypt(new TextEncoder().encode("secret"), key);
    await expect(decrypt(boxed, other)).rejects.toThrow();
  });

  it("fails decryption when ciphertext is tampered", async () => {
    const key = await randomKey();
    const boxed = await encrypt(new Uint8Array([0]), key);
    const tampered = new Uint8Array(boxed);
    tampered[tampered.length - 1] ^= 1;
    await expect(decrypt(tampered, key)).rejects.toThrow();
  });

  it("rejects key of wrong length", async () => {
    const short = new Uint8Array(SECRETBOX_KEY_BYTES - 1);
    crypto.getRandomValues(short);
    await expect(encrypt(new Uint8Array([0]), short)).rejects.toThrow(/key/i);
  });

  it("rejects boxed blob that is too short", async () => {
    const key = await randomKey();
    await expect(decrypt(new Uint8Array(8), key)).rejects.toThrow(/short/i);
  });
});
