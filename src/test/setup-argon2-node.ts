/**
 * argon2-browser resolves `argon2.wasm` via fetch (browser) or `readBinary` (__dirname).
 * Under Vitest/Node the default path often fails; preloading `wasmBinary` matches Emscripten's
 * supported bootstrap path when `self.Module` is wired before the library loads.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const wasmPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../node_modules/argon2-browser/dist/argon2.wasm",
);
const wasmBinary = new Uint8Array(readFileSync(wasmPath));

const g = globalThis as typeof globalThis & {
  self: typeof globalThis & { Module?: { wasmBinary?: Uint8Array } };
};

g.self = g.self ?? g;
g.self.Module = { ...(g.self.Module ?? {}), wasmBinary };
