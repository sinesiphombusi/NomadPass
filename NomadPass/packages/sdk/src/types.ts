export type CredentialType =
  | "passport"
  | "identity-card"
  | "university-certificate"
  | "work-credential";

export type ShareScope = {
  revealName: boolean;
  revealDocumentType: boolean;
  revealExpiry: boolean;
  allowFileAccess: boolean;
};
