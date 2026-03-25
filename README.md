# Liber Praxis

Privacy-native practice management for licensed behavioral health professionals.

## What it is

Liber Praxis is a practice management platform for therapists, counselors, 
and psychiatrists in solo and small group private practice.

It is the first product in this market built on a local-first, 
end-to-end encrypted architecture. Client data never exists in a readable 
form on any server the developer controls.

## Why it exists

Every competing product — SimplePractice, TherapyNotes, TheraNest — stores 
client records in cloud databases they can read. They comply with HIPAA 
through contracts and operational policies. Liber Praxis complies through 
architecture: data is encrypted on the practitioner's device before it goes 
anywhere, and our servers hold only ciphertext we cannot read.

## How the encryption works

1. The practitioner creates an account with a password
2. Argon2id derives an encryption key from the password locally — 
   the key never leaves the device
3. All data is encrypted with libsodium (XSalsa20-Poly1305) before 
   storage or transmission
4. A 24-word BIP39 recovery phrase is generated at account creation — 
   the practitioner stores this offline, Liber Praxis never holds it
5. Optional encrypted sync to AWS S3 — only ciphertext reaches the server
6. Cross-device access works by downloading and decrypting blobs locally 
   on each device

## Architecture

- **Frontend:** React + TypeScript
- **Local database:** SQLite via sql.js (browser) / better-sqlite3 (desktop)
- **Encryption:** libsodium-wrappers (XSalsa20-Poly1305)
- **Key derivation:** Argon2id via argon2-browser
- **Sync:** PowerSync (local-first, conflict-free)
- **Cloud storage:** AWS S3 (encrypted blobs only)
- **Desktop:** Tauri (Phase 3)
- **Billing:** Stripe

## What we never do

- Store readable patient data on our servers
- Transmit the encryption key
- Hold the recovery phrase
- Install analytics inside the application
- Share data with third parties

## Security

See SECURITY.md for our responsible disclosure policy.

The encryption layer is open source and auditable. 
We use only established, well-audited cryptographic libraries. 
We do not write custom cryptographic code.

## Development status

Phase 1 — MVP in development

## License

MIT
