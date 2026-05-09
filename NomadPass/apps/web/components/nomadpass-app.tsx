"use client";

import { useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  BadgeCheck,
  FileLock2,
  Fingerprint,
  Globe2,
  KeyRound,
  Link2,
  Lock,
  Plane,
  QrCode,
  ShieldCheck,
  Sparkles,
  Upload,
  Wallet
} from "lucide-react";
import { buildAgentChecks, classifyCredential } from "@/lib/agent";
import { encryptFile, sha256Base64 } from "@/lib/crypto";
import { connectPhantom, demoPublicKey, makeExplorerUrl, shortKey } from "@/lib/solana-demo";
import type { Credential } from "@/lib/types";

const demoCredential: Credential = {
  id: "demo-passport",
  title: "Verified Passport Credential",
  type: "Passport",
  owner: "Demo6E9A1C2F7B90Nomad",
  state: "minted",
  confidence: 92,
  encryptedCid: "bafyNomadEncryptedDemoCid",
  credentialPda: "CredPDA9b4E12NomadPass",
  nftMint: "Mint7mQ2PassportCredential",
  txSignature: "5xDemoNomadPassSolanaSignature",
  expiresAt: "2028-05-09",
  checks: buildAgentChecks("passport.pdf")
};

export function NomadPassApp() {
  const [wallet, setWallet] = useState("");
  const [credential, setCredential] = useState<Credential>(demoCredential);
  const [isWorking, setIsWorking] = useState(false);

  const verifyUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://nomadpass.app/verify/demo";
    return `${window.location.origin}/verify/${credential.id}`;
  }, [credential.id]);

  async function handleConnect() {
    const publicKey = await connectPhantom();
    setWallet(publicKey);
    setCredential((current) => ({ ...current, owner: publicKey }));
  }

  async function handleFile(file: File) {
    setIsWorking(true);
    try {
      const encrypted = await encryptFile(file);
      const salt = crypto.randomUUID();
      const commitment = await sha256Base64(`${wallet || "demo"}:${salt}:${encrypted.fileHash}`);
      const id = crypto.randomUUID();
      const type = classifyCredential(file.name) as Credential["type"];
      const cid = `ipfs://${demoPublicKey("bafy")}`;

      setCredential({
        id,
        title: `Verified ${type}`,
        type,
        owner: wallet || demoPublicKey("Demo"),
        state: "minted",
        confidence: type === "Passport" ? 94 : 89,
        encryptedCid: cid,
        credentialPda: demoPublicKey("CredPDA"),
        nftMint: demoPublicKey("Mint"),
        txSignature: demoPublicKey("Tx"),
        expiresAt: "2028-05-09",
        checks: [
          ...buildAgentChecks(file.name),
          {
            label: "Credential commitment",
            status: "complete",
            detail: `${commitment.slice(0, 18)}... anchored in the demo transaction.`
          }
        ]
      });
    } finally {
      setIsWorking(false);
    }
  }

  function revokeShare() {
    setCredential((current) => ({ ...current, state: "revoked" }));
  }

  function restoreShare() {
    setCredential((current) => ({ ...current, state: "shared" }));
  }

  const statusLabel = credential.state === "revoked" ? "Access revoked" : "Verified";

  return (
    <main className="min-h-screen overflow-hidden">
      <section className="passport-grid border-b border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-6 sm:px-8 lg:px-10">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg border border-mint/30 bg-mint/10">
                <Plane className="size-5 text-mint" />
              </div>
              <div>
                <p className="text-lg font-semibold">NomadPass</p>
                <p className="text-xs text-slate-400">Verify once. Use everywhere.</p>
              </div>
            </div>
            <button
              onClick={handleConnect}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.08] px-4 py-2 text-sm font-medium text-white transition hover:bg-white/[0.12]"
            >
              <Wallet className="size-4" />
              {wallet ? shortKey(wallet) : "Connect Phantom"}
            </button>
          </nav>

          <div className="grid gap-8 pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-mint/25 bg-mint/10 px-3 py-1 text-sm text-mint">
                <Sparkles className="size-4" />
                Agent-powered Solana credential wallet
              </div>
              <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-normal sm:text-6xl">
                Your credentials. Your freedom.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
                Upload identity or work documents once, encrypt them offchain, anchor proof on
                Solana, and share a QR verification link anywhere a borderless professional needs
                trust.
              </p>
            </div>

            <CredentialCard credential={credential} statusLabel={statusLabel} />
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
        <UploadPanel onFile={handleFile} isWorking={isWorking} />
        <AgentPanel credential={credential} />
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-10 sm:px-8 lg:grid-cols-3 lg:px-10">
        <ProofPanel credential={credential} />
        <SharePanel
          credential={credential}
          verifyUrl={verifyUrl}
          onRevoke={revokeShare}
          onRestore={restoreShare}
        />
        <VerifierPanel credential={credential} verifyUrl={verifyUrl} />
      </section>
    </main>
  );
}

function CredentialCard({
  credential,
  statusLabel
}: {
  credential: Credential;
  statusLabel: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-panel/90 p-5 shadow-glow backdrop-blur">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400">Credential NFT</p>
          <h2 className="mt-1 text-2xl font-semibold">{credential.title}</h2>
        </div>
        <div className="rounded-md bg-mint/12 px-3 py-1 text-sm font-medium text-mint">
          {statusLabel}
        </div>
      </div>
      <div className="mt-8 rounded-lg border border-white/10 bg-ink p-5">
        <div className="flex items-center justify-between">
          <Fingerprint className="size-10 text-passport" />
          <p className="text-right text-sm text-slate-400">NomadPass<br />Devnet MVP</p>
        </div>
        <div className="mt-8 space-y-3">
          <DataRow label="Owner" value={shortKey(credential.owner)} />
          <DataRow label="Type" value={credential.type} />
          <DataRow label="Confidence" value={`${credential.confidence}%`} />
          <DataRow label="Expires" value={credential.expiresAt} />
        </div>
      </div>
    </div>
  );
}

function UploadPanel({
  onFile,
  isWorking
}: {
  onFile: (file: File) => void;
  isWorking: boolean;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-5">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-md bg-passport/20">
          <Upload className="size-5 text-passport" />
        </div>
        <div>
          <h2 className="font-semibold">Upload credential</h2>
          <p className="text-sm text-slate-400">Passport, ID, certificate, or work proof.</p>
        </div>
      </div>
      <label className="mt-5 flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/[0.03] px-4 text-center transition hover:border-mint/50 hover:bg-mint/[0.04]">
        <FileLock2 className="mb-4 size-10 text-mint" />
        <span className="text-base font-medium">
          {isWorking ? "Encrypting and preparing proof..." : "Drop a document or choose file"}
        </span>
        <span className="mt-2 max-w-sm text-sm text-slate-400">
          The MVP encrypts locally, simulates IPFS pinning, and produces Solana-ready proof data.
        </span>
        <input
          type="file"
          className="sr-only"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
          }}
        />
      </label>
    </section>
  );
}

function AgentPanel({ credential }: { credential: Credential }) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-5">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-md bg-mint/15">
          <Sparkles className="size-5 text-mint" />
        </div>
        <div>
          <h2 className="font-semibold">Agent verification trace</h2>
          <p className="text-sm text-slate-400">Visible workflow for judges and users.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        {credential.checks.map((check) => (
          <div key={check.label} className="rounded-lg border border-white/10 bg-ink p-4">
            <div className="flex items-center gap-2">
              <BadgeCheck
                className={
                  check.status === "warning" ? "size-5 text-amber" : "size-5 text-mint"
                }
              />
              <p className="font-medium">{check.label}</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">{check.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProofPanel({ credential }: { credential: Credential }) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-5">
      <PanelTitle icon={<ShieldCheck className="size-5 text-mint" />} title="Onchain proof" />
      <div className="mt-5 space-y-3">
        <DataRow label="Credential PDA" value={shortKey(credential.credentialPda)} />
        <DataRow label="NFT mint" value={shortKey(credential.nftMint)} />
        <DataRow label="Encrypted CID" value={shortKey(credential.encryptedCid)} />
        <a
          href={makeExplorerUrl(credential.txSignature)}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-ink"
        >
          <Globe2 className="size-4" />
          View devnet proof
        </a>
      </div>
    </section>
  );
}

function SharePanel({
  credential,
  verifyUrl,
  onRevoke,
  onRestore
}: {
  credential: Credential;
  verifyUrl: string;
  onRevoke: () => void;
  onRestore: () => void;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-5">
      <PanelTitle icon={<QrCode className="size-5 text-passport" />} title="Permissioned share" />
      <div className="mt-5 grid place-items-center rounded-lg border border-white/10 bg-white p-4">
        <QRCodeSVG value={verifyUrl} size={168} fgColor="#080B10" />
      </div>
      <div className="mt-4 flex gap-3">
        <button
          onClick={onRestore}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-mint px-3 py-2 text-sm font-semibold text-ink"
        >
          <Link2 className="size-4" />
          Share
        </button>
        <button
          onClick={onRevoke}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white"
        >
          <Lock className="size-4" />
          Revoke
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">
        State: {credential.state === "revoked" ? "revoked onchain" : "active share grant"}
      </p>
    </section>
  );
}

function VerifierPanel({
  credential,
  verifyUrl
}: {
  credential: Credential;
  verifyUrl: string;
}) {
  return (
    <section className="rounded-lg border border-white/10 bg-panel p-5">
      <PanelTitle icon={<KeyRound className="size-5 text-amber" />} title="Verifier view" />
      <div className="mt-5 rounded-lg border border-white/10 bg-ink p-4">
        <p className="text-sm text-slate-400">Public result</p>
        <p className="mt-2 text-2xl font-semibold">
          {credential.state === "revoked" ? "Access revoked" : "Credential verified"}
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Verifiers see status, issuer, expiry, and proof references. Private files remain encrypted
          unless the owner grants access.
        </p>
      </div>
      <a
        href={verifyUrl}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white"
      >
        <QrCode className="size-4" />
        Open verification page
      </a>
    </section>
  );
}

function PanelTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-md bg-white/[0.08]">{icon}</div>
      <h2 className="font-semibold">{title}</h2>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-2 last:border-b-0">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="truncate text-right text-sm font-medium text-white">{value}</span>
    </div>
  );
}
