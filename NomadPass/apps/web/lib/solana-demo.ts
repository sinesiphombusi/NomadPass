export function shortKey(value: string) {
  if (!value) return "Not connected";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function makeExplorerUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export function demoPublicKey(prefix = "Nomad") {
  const body = crypto.randomUUID().replaceAll("-", "").slice(0, 28);
  return `${prefix}${body}`;
}

export async function connectPhantom(): Promise<string> {
  const provider = window?.solana;
  if (provider?.isPhantom) {
    const response = await provider.connect();
    return response.publicKey.toString();
  }
  return demoPublicKey("Demo");
}

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
    };
  }
}
