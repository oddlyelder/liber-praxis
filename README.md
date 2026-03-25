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
5. Optional encrypted sync to
