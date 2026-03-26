import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// https://vite.dev/config/
const libsodiumCjsPath = fileURLToPath(
  new URL("./node_modules/libsodium-wrappers/dist/modules/libsodium-wrappers.js", import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ["argon2-browser"],
  },
  worker: {
    format: "es",
  },
  test: {
    environment: "node",
    pool: "forks",
    alias: {
      // libsodium-wrappers ESM build imports a missing `libsodium.mjs` in Node tests.
      // Use the CJS bundle in Vitest via absolute path to avoid package exports checks.
      "libsodium-wrappers": libsodiumCjsPath,
    },
    setupFiles: ["src/test/setup-argon2-node.ts"],
    include: ["src/**/*.test.ts"],
  },
});
