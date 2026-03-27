import { describe, expect, it } from "vitest";
import { ensureSodiumReady, SECRETBOX_KEY_BYTES } from "../crypto/encryption";
import { EncryptedStorage, type EncryptedStorageBackend } from "./encryptedStorage";
import { AccountRepository } from "./accountRepository";

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

describe("AccountRepository", () => {
  it("creates and reads an account", async () => {
    const backend = new MemoryBackend();
    const storage = new EncryptedStorage(backend, await randomKey(), { namespace: "accounts" });
    const repo = new AccountRepository(storage);

    const created = await repo.create({ accountId: "acc_1", label: "Personal" });
    const loaded = await repo.get("acc_1");

    expect(loaded).toEqual(created);
    expect(created.createdAt).toBeTypeOf("number");
    expect(created.updatedAt).toBeTypeOf("number");
  });

  it("rejects duplicate create", async () => {
    const backend = new MemoryBackend();
    const repo = new AccountRepository(
      new EncryptedStorage(backend, await randomKey(), { namespace: "accounts" }),
    );

    await repo.create({ accountId: "acc_1" });
    await expect(repo.create({ accountId: "acc_1" })).rejects.toThrow(/exists/i);
  });

  it("upsert updates label and bumps updatedAt", async () => {
    const backend = new MemoryBackend();
    const repo = new AccountRepository(
      new EncryptedStorage(backend, await randomKey(), { namespace: "accounts" }),
    );

    const a = await repo.create({ accountId: "acc_1", label: "A" });
    const b = await repo.upsert("acc_1", { label: "B" });

    expect(b.label).toBe("B");
    expect(b.createdAt).toBe(a.createdAt);
    expect(b.updatedAt).toBeGreaterThanOrEqual(a.updatedAt);
  });

  it("upsert allows explicitly clearing nullable fields with null", async () => {
    const backend = new MemoryBackend();
    const repo = new AccountRepository(
      new EncryptedStorage(backend, await randomKey(), { namespace: "accounts" }),
    );

    await repo.create({
      accountId: "acc_1",
      label: "Has label",
      metadata: { source: "seed" },
    });
    const updated = await repo.upsert("acc_1", { label: null, metadata: null });

    expect(updated.label).toBeNull();
    expect(updated.metadata).toBeNull();
  });

  it("listAccountIds returns all account ids in namespace", async () => {
    const backend = new MemoryBackend();
    const repo = new AccountRepository(
      new EncryptedStorage(backend, await randomKey(), { namespace: "accounts" }),
    );

    await repo.create({ accountId: "a" });
    await repo.create({ accountId: "b" });
    expect(await repo.listAccountIds()).toEqual(["a", "b"]);
  });

  it("deletes an account", async () => {
    const backend = new MemoryBackend();
    const repo = new AccountRepository(
      new EncryptedStorage(backend, await randomKey(), { namespace: "accounts" }),
    );

    await repo.create({ accountId: "acc_1" });
    await repo.delete("acc_1");
    expect(await repo.get("acc_1")).toBeUndefined();
  });
});

