import { PublicKey } from "@solana/web3.js";

export const NOMADPASS_PROGRAM_ID = new PublicKey(
  "Nomad11111111111111111111111111111111111111"
);

export function deriveProfilePda(owner: PublicKey, programId = NOMADPASS_PROGRAM_ID) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("profile"), owner.toBuffer()],
    programId
  );
}

export function deriveCredentialPda(
  owner: PublicKey,
  credentialId: Uint8Array,
  programId = NOMADPASS_PROGRAM_ID
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("credential"), owner.toBuffer(), Buffer.from(credentialId)],
    programId
  );
}

export function deriveShareGrantPda(
  credential: PublicKey,
  verifier: PublicKey,
  programId = NOMADPASS_PROGRAM_ID
) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("share"), credential.toBuffer(), verifier.toBuffer()],
    programId
  );
}
