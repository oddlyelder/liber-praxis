import Dexie, { type Table } from "dexie";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { DATABASE_FILE_NAME, DATABASE_SCHEMA_SQL } from "./schema";
import { EncryptedStorage, type EncryptedStorageBackend } from "./encryptedStorage";

type KvRow = {
  key: string;
  value: Uint8Array;
  updatedAt: number;
};

class LiberPraxisDexie extends Dexie {
  kv!: Table<KvRow, string>;

  constructor(name = "LiberPraxis") {
    super(name);
    this.version(1).stores({
      kv: "&key, updatedAt",
    });
  }
}

class DexieBackend implements EncryptedStorageBackend {
  private readonly table: Table<KvRow, string>;

  constructor(table: Table<KvRow, string>) {
    this.table = table;
  }

  async get(key: string): Promise<Uint8Array | undefined> {
    const row = await this.table.get(key);
    return row?.value;
  }

  async put(key: string, value: Uint8Array): Promise<void> {
    await this.table.put({ key, value, updatedAt: Date.now() });
  }

  async delete(key: string): Promise<void> {
    await this.table.delete(key);
  }

  async listKeys(prefix = ""): Promise<string[]> {
    // Dexie doesn't have a direct prefix index by default; filter in-memory.
    // For large datasets, add an index on key and do `startsWith` queries.
    const keys = await this.table.toCollection().primaryKeys();
    return keys.filter((k): k is string => typeof k === "string" && k.startsWith(prefix));
  }
}

let sqlJsSingleton: Promise<SqlJsStatic> | null = null;

async function getSqlJs(): Promise<SqlJsStatic> {
  if (!sqlJsSingleton) {
    sqlJsSingleton = initSqlJs({
      locateFile: (file: string) =>
        new URL(`../node_modules/sql.js/dist/${file}`, import.meta.url).toString(),
    });
  }
  return await sqlJsSingleton;
}

export type OpenDatabaseOptions = {
  /** Dexie database name in IndexedDB. */
  indexedDbName?: string;
  /** Key used to encrypt the persisted sql.js database bytes. */
  encryptionKey: Uint8Array;
  /**
   * Storage key used for the single persisted sqlite database file.
   * If you ever introduce per-account DBs, vary this per account.
   */
  storageKey?: string;
};

export type OpenDatabaseResult = {
  db: Database;
  /** Persist current state to IndexedDB (encrypted). */
  persist: () => Promise<void>;
  /** Close Dexie handles (sql.js is in-memory). */
  close: () => Promise<void>;
  /** Access the underlying Dexie instance for advanced usage. */
  dexie: Dexie;
};

function ensureSchema(db: Database): void {
  db.exec(DATABASE_SCHEMA_SQL);
}

/**
 * Open the local-first database.
 *
 * Persistence model:
 * - sql.js runs entirely in-memory (SQLite compiled to WASM)
 * - on persist/load we serialize the DB bytes and store them in IndexedDB
 * - those serialized bytes are encrypted via {@link EncryptedStorage}
 */
export async function openDatabase(options: OpenDatabaseOptions): Promise<OpenDatabaseResult> {
  const dexie = new LiberPraxisDexie(options.indexedDbName);
  const backend = new DexieBackend((dexie as LiberPraxisDexie).kv);
  const encrypted = new EncryptedStorage(backend, options.encryptionKey, {
    namespace: "sqlite",
    encodePlaintext: (v) => {
      if (!(v instanceof Uint8Array)) throw new Error("Expected Uint8Array plaintext for sqlite");
      return v;
    },
    decodePlaintext: (b) => b,
  });

  await dexie.open();

  const sqlJs = await getSqlJs();
  const storageKey = options.storageKey ?? DATABASE_FILE_NAME;

  const existingBytes = await encrypted.getJson<Uint8Array>(storageKey);
  const db = existingBytes ? new sqlJs.Database(existingBytes) : new sqlJs.Database();
  ensureSchema(db);

  const persist = async (): Promise<void> => {
    const bytes = db.export();
    await encrypted.putJson(storageKey, bytes);
  };

  const close = async (): Promise<void> => {
    dexie.close();
  };

  return { db, persist, close, dexie };
}

