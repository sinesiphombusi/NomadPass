export type CredentialState =
  | "idle"
  | "uploaded"
  | "encrypted"
  | "agent-reviewed"
  | "anchored"
  | "minted"
  | "shared"
  | "revoked";

export type AgentCheck = {
  label: string;
  status: "complete" | "warning" | "pending";
  detail: string;
};

export type Credential = {
  id: string;
  title: string;
  type: "Passport" | "University Certificate" | "Work Credential" | "Identity Card";
  owner: string;
  state: CredentialState;
  confidence: number;
  encryptedCid: string;
  credentialPda: string;
  nftMint: string;
  txSignature: string;
  expiresAt: string;
  checks: AgentCheck[];
};
