import { describe, expect, it } from "vitest";
import { ensureSodiumReady, SECRETBOX_KEY_BYTES } from "../crypto/encryption";
import { EncryptedStorage, type EncryptedStorageBackend } from "./encryptedStorage";

class MemoryBackend implements EncryptedStorageBackend {
  private readonly map = new Map<string, Uint8Array>();

  async get(key: string): Promise<Uint8Array | undefined> {
    return this.map.get(key);
  }

  async put(key: string, value: Uint8Array): Promise<void> {
    this.map.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }

  async listKeys(prefix = ""): Promise<string[]> {
    return [...this.map.keys()].filter((k) => k.startsWith(prefix)).sort();
  }
}

async function randomKey(): Promise<Uint8Array> {
  await ensureSodiumReady();
  const k = new Uint8Array(SECRETBOX_KEY_BYTES);
  crypto.getRandomValues(k);
  return k;
}

describe("EncryptedStorage", () => {
  it("round-trips JSON values", async () => {
    const backend = new MemoryBackend();
    const storage = new EncryptedStorage(backend, await randomKey(), { namespace: "ns" });

    await storage.putJson("k1", { a: 1, b: "two" });
    const value = await storage.getJson<{ a: number; b: string }>("k1");
    expect(value).toEqual({ a: 1, b: "two" });
  });

  it("writes ciphertext (not plaintext) to backend", async () => {
    const backend = new MemoryBackend();
    const storage = new EncryptedStorage(backend, await randomKey());
    await storage.putJson("k", { secret: "value" });

    const raw = await backend.get("k");
    expect(raw).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(raw!)).not.toContain("secret");
    expect(new TextDecoder().decode(raw!)).not.toContain("value");
  });

  it("returns undefined for missing keys", async () => {
    const backend = new MemoryBackend();
    const storage = new EncryptedStorage(backend, await randomKey());
    expect(await storage.getJson("missing")).toBeUndefined();
  });

  it("fails decryption with wrong key", async () => {
    const backend = new MemoryBackend();
    const keyA = await randomKey();
    const keyB = await randomKey();
    const a = new EncryptedStorage(backend, keyA);
    const b = new EncryptedStorage(backend, keyB);

    await a.putJson("k", { x: 1 });
    await expect(b.getJson("k")).rejects.toThrow();
  });

  it("supports listKeys with namespace stripping", async () => {
    const backend = new MemoryBackend();
    const storage = new EncryptedStorage(backend, await randomKey(), { namespace: "accounts" });

    await storage.putJson("a1", { ok: true });
    await storage.putJson("a2", { ok: true });

    expect(await storage.listKeys()).toEqual(["a1", "a2"]);
    expect(await backend.listKeys()).toEqual(["accounts/a1", "accounts/a2"]);
  });
});

