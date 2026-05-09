export type CredentialMetadata = {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
};

export function buildCredentialMetadata({
  type,
  owner,
  credentialPda,
  encryptedCid
}: {
  type: string;
  owner: string;
  credentialPda: string;
  encryptedCid: string;
}): CredentialMetadata {
  return {
    name: `NomadPass Verified ${type}`,
    description:
      "A privacy-preserving NomadPass credential anchored on Solana. The underlying document is encrypted and stored offchain.",
    image: "ipfs://nomadpass-passport-card-placeholder",
    attributes: [
      { trait_type: "Credential Type", value: type },
      { trait_type: "Owner", value: owner },
      { trait_type: "Credential PDA", value: credentialPda },
      { trait_type: "Encrypted Storage", value: encryptedCid }
    ]
  };
}
