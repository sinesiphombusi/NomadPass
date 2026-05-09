import { BadgeCheck, Lock, Plane } from "lucide-react";

export default async function VerifyPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const isRevoked = token.toLowerCase().includes("revoked");

  return (
    <main className="passport-grid min-h-screen px-5 py-8">
      <section className="mx-auto max-w-xl rounded-lg border border-white/10 bg-panel p-6 shadow-glow">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-mint/10">
              <Plane className="size-5 text-mint" />
            </div>
            <div>
              <p className="font-semibold">NomadPass</p>
              <p className="text-sm text-slate-400">Verification result</p>
            </div>
          </div>
          {isRevoked ? (
            <Lock className="size-6 text-amber" />
          ) : (
            <BadgeCheck className="size-6 text-mint" />
          )}
        </div>

        <div className="mt-8 rounded-lg border border-white/10 bg-ink p-5">
          <p className="text-sm text-slate-400">Credential status</p>
          <h1 className="mt-2 text-3xl font-semibold">
            {isRevoked ? "Access revoked" : "Verified credential"}
          </h1>
          <p className="mt-4 leading-7 text-slate-300">
            This credential has an onchain NomadPass record. Private document contents are encrypted
            offchain and only revealed through owner-approved access grants.
          </p>
        </div>

        <div className="mt-5 space-y-3 text-sm">
          <Row label="Token" value={token} />
          <Row label="Network" value="Solana devnet" />
          <Row label="Credential" value="Passport / identity proof" />
          <Row label="Expires" value="2028-05-09" />
        </div>
      </section>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3">
      <span className="text-slate-400">{label}</span>
      <span className="max-w-56 truncate text-right font-medium">{value}</span>
    </div>
  );
}
