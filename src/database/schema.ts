export type RowId = number;

export type TimestampMillis = number;

export type JsonObject = Record<string, unknown>;

export type BaseRow = {
  id: RowId;
  createdAt: TimestampMillis;
  updatedAt: TimestampMillis;
};

export type AccountRow = BaseRow & {
  /** Stable identifier for the logical account (not secret). */
  accountId: string;
  /** User-facing label for the account (not secret). */
  label: string | null;
  /** Optional notes or metadata (may be partially or fully encrypted at higher layers). */
  metadata: JsonObject | null;
};

export type ClientRow = BaseRow & {
  /** Foreign key to account. */
  accountId: string;
  /** Identifier for this client/device (e.g. "desktop-1"). */
  clientId: string;
  /** Device/platform description for UX. */
  deviceLabel: string | null;
  /** Arbitrary client metadata (e.g. capabilities). */
  metadata: JsonObject | null;
};

export type SessionRow = BaseRow & {
  /** Foreign key to account. */
  accountId: string;
  /** Foreign key to client. */
  clientId: string;
  /** Session identifier (logical, not DB primary key). */
  sessionId: string;
  /** When the session was last used, in ms since epoch. */
  lastActiveAt: TimestampMillis;
  /** Arbitrary session metadata. */
  metadata: JsonObject | null;
};

export type DocumentRow = BaseRow & {
  /** Foreign key to account. */
  accountId: string;
  /** Application-level document identifier. */
  documentId: string;
  /** Human-readable title (may be duplicated in encrypted payload for deniability). */
  title: string | null;
  /** Optional tags for local filtering. */
  tags: string[] | null;
  /** Arbitrary document metadata (e.g. lastOpenedAt). */
  metadata: JsonObject | null;
};

export type TableName = "accounts" | "clients" | "sessions" | "documents";

export type TableRowMap = {
  accounts: AccountRow;
  clients: ClientRow;
  sessions: SessionRow;
  documents: DocumentRow;
};

export const DATABASE_FILE_NAME = "liber-praxis.db";

export const DATABASE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL UNIQUE,
  label TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  device_label TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (account_id, client_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  last_active_at INTEGER NOT NULL,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (account_id, client_id, session_id)
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  title TEXT,
  tags TEXT,
  metadata TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (account_id, document_id)
);
`;

