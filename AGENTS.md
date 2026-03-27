# AGENTS.md — Liber Praxis Project Context

> Paste this file into any AI assistant (VS Code Copilot, Gemini, Claude, etc.)
> at the start of each session to restore full project context.
> Last updated: March 2026

---

## What Is This Project

Liber Praxis ("The Book of Practice") is a privacy-native, local-first,
end-to-end encrypted practice management platform for licensed behavioral
health professionals (therapists, counselors, psychiatrists).

- GitHub: https://github.com/oddlyelder/liber-praxis (public, MIT license)
- Domain: liberpraxis.com
- GitHub handle: oddlyelder
- Solo founder: Sean, Lafayette LA — non-technical, learning as he goes

---

## Non-Negotiable Architecture Constraints

1. **Local-first** — SQLite via sql.js, works fully offline
2. **E2E encrypted** — Argon2id key derivation locally, libsodium XSalsa20-Poly1305, key never transmitted
3. **Optional S3 sync** — only ciphertext reaches the server, never plaintext
4. **React + TypeScript** frontend (Vite)
5. **BIP39 24-word recovery phrase** at account creation — never held by Liber Praxis
6. **Tauri desktop app** wrap in a later phase
7. **No analytics inside the app** — Simple Analytics on marketing site only
8. **Opt-in Sentry** error reporting with aggressive scrubbing, off by default

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript (Vite) |
| Local DB | sql.js (SQLite via WASM) |
| Encryption | libsodium-wrappers (XSalsa20-Poly1305) |
| Key derivation | argon2-browser (Argon2id) |
| Recovery phrase | bip39 |
| IndexedDB persistence | Dexie.js |
| Sync | PowerSync (planned) |
| Cloud storage | AWS S3 (encrypted blobs only) |
| Desktop | Tauri (Phase 3) |
| Billing | Stripe |
| Clearinghouse | Office Ally (Phase 3) |
| E-prescribing | DoseSpot API (Phase 4) |
| Marketing analytics | Simple Analytics (marketing site only) |
| Error reporting | Sentry (opt-in, app only) |

---

## Folder Structure

```
src/
├── crypto/           # LP-01 — encryption, key derivation, recovery phrase
├── database/         # LP-02 — schema, encrypted storage, repositories
├── features/         # LP-03+ — one subfolder per domain
│   ├── auth/
│   ├── clients/
│   ├── sessions/
│   ├── documents/
│   └── scheduling/
├── sync/             # S3 encrypted sync (later)
├── components/       # shared UI
├── hooks/            # shared React hooks
└── types/            # shared TypeScript types
```

---

## Session Log

### LP-01 — Encryption Layer ✅
`src/crypto/` — keyDerivation.ts, encryption.ts, recoveryPhrase.ts + tests
20 tests passing.

### LP-02 — Database Layer 🔄
`src/database/` — schema.ts, db.ts, encryptedStorage.ts, accountRepository.ts + tests
30 tests passing. Upsert bug fix in progress. Not yet committed.

### LP-03 — Auth Feature ⬜
`src/features/auth/` — account creation UI wired to crypto + database layers

---

## Coding Session Rules

- One specific task per session
- Run `npm run test:run` before every commit
- Commit format: `git commit -m "brief description of what was built"`
- Never commit `.env` files or credentials
- Explain every security decision; identify weaknesses after each file

---

## How to Hand Off Between Editors

**Before switching editors:**
```
git add .
git commit -m "describe what you just did"
git push
```

**After switching editors:**
```
git pull
```

Then paste this file into the AI assistant to restore context.

---

## Pricing

- Solo: $99/month or $89/month annual
- Practice (2–5 providers): $199/month
- Group (6–15 providers): $349/month
- Founding members: $59/month locked for life

---

## Immediate Next Action (LP-02 Closeout)

1. Confirm upsert bug fix in `src/database/accountRepository.ts`
2. `npm run test:run` — all 30 tests must pass
3. `git add .`
4. `git commit -m "Add database layer — schema, encrypted storage, account repository"`
5. `git push`
