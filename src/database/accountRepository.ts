import { EncryptedStorage } from "./encryptedStorage";

export type AccountRecord = {
  /** Stable identifier (non-secret), used for lookups and foreign keys. */
  accountId: string;
  /** User-facing label. If sensitive in your model, move into encrypted payload-only fields later. */
  label: string | null;
  /** Millis since epoch. */
  createdAt: number;
  /** Millis since epoch. */
  updatedAt: number;
  /** Reserved for future extension (profile, preferences, etc.). */
  metadata?: Record<string, unknown> | null;
};

function nowMs(): number {
  return Date.now();
}

function assertAccountId(accountId: string): void {
  if (!accountId || !accountId.trim()) throw new Error("accountId must be non-empty");
  if (accountId.includes("/")) throw new Error("accountId must not include '/'");
}

/**
 * Repository for account records stored in encrypted KV storage.
 *
 * Storage shape:
 * - keys: `${accountId}`
 * - values: full AccountRecord (encrypted)
 */
export class AccountRepository {
  private readonly storage: EncryptedStorage;

  constructor(storage: EncryptedStorage) {
    this.storage = storage;
  }

  static withNamespace(storage: EncryptedStorage): AccountRepository {
    // Allow callers to pass a shared EncryptedStorage; we isolate account keys by convention.
    // If you prefer strict enforcement, construct the EncryptedStorage with namespace: "accounts".
    return new AccountRepository(storage);
  }

  async create(input: Pick<AccountRecord, "accountId"> & Partial<AccountRecord>): Promise<AccountRecord> {
    assertAccountId(input.accountId);
    const existing = await this.get(input.accountId);
    if (existing) throw new Error("Account already exists");

    const t = nowMs();
    const record: AccountRecord = {
      accountId: input.accountId,
      label: input.label ?? null,
      metadata: input.metadata ?? null,
      createdAt: t,
      updatedAt: t,
    };
    await this.storage.putJson<AccountRecord>(record.accountId, record);
    return record;
  }

  async get(accountId: string): Promise<AccountRecord | undefined> {
    assertAccountId(accountId);
    return await this.storage.getJson<AccountRecord>(accountId);
  }

  async upsert(
    accountId: string,
    patch: Partial<Pick<AccountRecord, "label" | "metadata">>,
  ): Promise<AccountRecord> {
    assertAccountId(accountId);
    const existing = await this.get(accountId);
    const t = nowMs();

    const record: AccountRecord = existing
      ? {
          ...existing,
          label: patch.label !== undefined ? patch.label : existing.label,
          metadata: patch.metadata !== undefined ? patch.metadata : existing.metadata,
          updatedAt: t,
        }
      : {
          accountId,
          label: patch.label !== undefined ? patch.label : null,
          metadata: patch.metadata !== undefined ? patch.metadata : null,
          createdAt: t,
          updatedAt: t,
        };

    await this.storage.putJson<AccountRecord>(accountId, record);
    return record;
  }

  async delete(accountId: string): Promise<void> {
    assertAccountId(accountId);
    await this.storage.delete(accountId);
  }

  async listAccountIds(): Promise<string[]> {
    return await this.storage.listKeys("");
  }
}

