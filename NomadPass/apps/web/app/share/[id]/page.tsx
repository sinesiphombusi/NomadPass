"use client";

import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Lock, Plane } from "lucide-react";

export default function SharePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const verifyUrl = `/verify/${id}`;

  return (
    <main className="passport-grid min-h-screen px-5 py-8">
      <section className="mx-auto max-w-xl rounded-lg border border-white/10 bg-panel p-6 shadow-glow">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-mint/10">
            <Plane className="size-5 text-mint" />
          </div>
          <div>
            <p className="font-semibold">Share NomadPass credential</p>
            <p className="text-sm text-slate-400">Credential {id}</p>
          </div>
        </div>
        <div className="mt-8 grid place-items-center rounded-lg bg-white p-5">
          <QRCodeSVG value={verifyUrl} size={220} fgColor="#080B10" />
        </div>
        <button className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold">
          <Lock className="size-4" />
          Revoke share grant
        </button>
      </section>
    </main>
  );
}
