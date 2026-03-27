import { decrypt, encrypt } from "../crypto/encryption";

export type EncryptedStorageBackend = {
  get(key: string): Promise<Uint8Array | undefined>;
  put(key: string, value: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
  listKeys?(prefix?: string): Promise<string[]>;
};

export type EncryptedStorageOptions = {
  /** Prefix used for namespacing keys within a shared backend. */
  namespace?: string;
  /** Serializer for plaintext objects (defaults to JSON UTF-8). */
  encodePlaintext?: (value: unknown) => Uint8Array;
  /** Deserializer for plaintext objects (defaults to JSON UTF-8). */
  decodePlaintext?: (bytes: Uint8Array) => unknown;
};

const defaultEncodePlaintext = (value: unknown): Uint8Array =>
  new TextEncoder().encode(JSON.stringify(value));

const defaultDecodePlaintext = (bytes: Uint8Array): unknown =>
  JSON.parse(new TextDecoder().decode(bytes)) as unknown;

function joinKey(namespace: string | undefined, key: string): string {
  if (!namespace) return key;
  return namespace.endsWith("/") ? `${namespace}${key}` : `${namespace}/${key}`;
}

/**
 * Encrypted KV-style storage that ensures:
 * - ciphertext is the only thing written to the backend
 * - reads authenticate + decrypt before returning plaintext
 *
 * Threat model note: this encrypts *values*, not key names; keep keys non-sensitive.
 */
export class EncryptedStorage {
  private readonly backend: EncryptedStorageBackend;
  private readonly key: Uint8Array;
  private readonly namespace?: string;
  private readonly encodePlaintext: (value: unknown) => Uint8Array;
  private readonly decodePlaintext: (bytes: Uint8Array) => unknown;

  constructor(
    backend: EncryptedStorageBackend,
    encryptionKey: Uint8Array,
    options: EncryptedStorageOptions = {},
  ) {
    this.backend = backend;
    this.key = encryptionKey;
    this.namespace = options.namespace;
    this.encodePlaintext = options.encodePlaintext ?? defaultEncodePlaintext;
    this.decodePlaintext = options.decodePlaintext ?? defaultDecodePlaintext;
  }

  async putJson<T>(key: string, value: T): Promise<void> {
    const namespaced = joinKey(this.namespace, key);
    const plaintext = this.encodePlaintext(value);
    const boxed = await encrypt(plaintext, this.key);
    await this.backend.put(namespaced, boxed);
  }

  async getJson<T>(key: string): Promise<T | undefined> {
    const namespaced = joinKey(this.namespace, key);
    const boxed = await this.backend.get(namespaced);
    if (!boxed) return undefined;
    const plaintext = await decrypt(boxed, this.key);
    return this.decodePlaintext(plaintext) as T;
  }

  async delete(key: string): Promise<void> {
    const namespaced = joinKey(this.namespace, key);
    await this.backend.delete(namespaced);
  }

  async listKeys(prefix = ""): Promise<string[]> {
    if (!this.backend.listKeys) {
      throw new Error("Backend does not support listKeys()");
    }
    const nsPrefix = joinKey(this.namespace, prefix);
    const keys = await this.backend.listKeys(nsPrefix);
    if (!this.namespace) return keys;
    const normalizedNs = this.namespace.endsWith("/") ? this.namespace : `${this.namespace}/`;
    return keys
      .filter((k) => k.startsWith(normalizedNs))
      .map((k) => k.slice(normalizedNs.length));
  }
}

