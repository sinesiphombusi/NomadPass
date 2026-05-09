import { NextRequest, NextResponse } from "next/server";
import { buildAgentChecks, classifyCredential } from "@/lib/agent";

export async function POST(req: NextRequest) {
  const { fileName } = await req.json();
  const name = typeof fileName === "string" ? fileName : "credential.pdf";

  return NextResponse.json({
    type: classifyCredential(name),
    confidence: name.toLowerCase().includes("passport") ? 94 : 89,
    checks: buildAgentChecks(name)
  });
}
