# NomadPass

**Verify once. Use everywhere.**

NomadPass is an agent-powered onchain credential wallet for digital nomads, freelancers, remote workers, and global professionals.

Users upload documents like passports, IDs, university certificates, and work credentials. NomadPass encrypts the files, stores them offchain on IPFS, anchors authenticity and verification state on Solana, and mints a portable credential NFT to the user's wallet.

## Why It Matters

Remote workers repeatedly upload sensitive documents across platforms, borders, employers, and institutions. Verification is fragmented, repetitive, insecure, and slow.

NomadPass lets users verify credentials once and securely reuse them anywhere.

## MVP Features

- Mobile-first dark mode credential wallet
- Phantom-compatible wallet connection with demo fallback
- Client-side AES-GCM document encryption
- AI-style verification agent trace
- IPFS upload API with Pinata support and demo mode
- Solana credential proof UI
- QR verification page
- Share and revoke interaction
- Solana Actions/Blinks-compatible endpoint
- Anchor program for credential state and permission grants

## Stack

- Next.js
- TypeScript
- Tailwind
- Rust
- Anchor
- Solana
- Metaplex-ready NFT architecture
- IPFS

## Run The MVP

```bash
npm install
npm run dev
```

Then open:

```txt
http://localhost:3000
```

Optional IPFS pinning:

```bash
PINATA_JWT=your_token npm run dev
```

Without `PINATA_JWT`, the app uses demo CIDs so the hackathon flow still works.

## Demo Flow

1. Connect Phantom or use the demo wallet fallback.
2. Upload a passport, ID, certificate, or work credential.
3. NomadPass encrypts the file locally.
4. The agent classifies the document and shows validation checks.
5. The app creates Solana-ready proof references.
6. A credential NFT card appears in the wallet.
7. Share the QR verification link.
8. Open the verifier page.
9. Revoke access and show the permission state change.

## Onchain Design

The Anchor program stores:

- User profiles
- Credential PDAs
- Credential state
- NFT mint reference
- Encrypted CID hash
- Metadata URI hash
- Salted document commitment
- Share grants
- Revocation state

The program never stores raw documents or personal data onchain.

## Anchor Program

Program source:

```txt
programs/nomadpass/src/lib.rs
```

Core instructions:

- `initialize_profile`
- `create_credential`
- `mark_agent_reviewed`
- `verify_credential`
- `reject_credential`
- `revoke_credential`
- `create_share_grant`
- `revoke_share_grant`

## Solana Actions / Blinks

The MVP includes:

```txt
apps/web/public/actions.json
apps/web/app/api/actions/verify/[id]/route.ts
```

These endpoints expose the verification flow as a shareable action surface.

## Security Model

- Encrypt before upload
- Store encrypted blobs on IPFS
- Store only commitments and state on Solana
- Use scoped share grants
- Support revocation
- Keep the agent out of the trust root
- Require wallet signatures for production state changes

## Hackathon Positioning

NomadPass is not an NFT document storage app. It is a portable trust and verification layer for borderless professionals.

The winning loop:

```txt
upload -> agent verifies -> encrypt -> anchor on Solana -> mint credential -> share QR -> verifier confirms -> revoke
```

## Roadmap

- Deploy Anchor program to devnet
- Add real wallet transaction builders
- Mint Metaplex NFTs from the app
- Add Bubblegum V2 compressed credentials
- Add issuer registry
- Add institution verifier portal
- Add embedded wallets
- Add ZK selective disclosure

## Elevator Pitch

NomadPass is a portable trust wallet for borderless professionals. Instead of uploading passports, certificates, and work credentials over and over again, users verify once, encrypt their documents, anchor proof on Solana, and reuse credentials anywhere through QR links, wallet ownership, and permissioned sharing.
