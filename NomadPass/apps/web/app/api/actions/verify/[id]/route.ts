import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(
    {
      icon: "https://nomadpass.app/icon.png",
      title: "Verify NomadPass Credential",
      description:
        "Check this credential's Solana-anchored verification state and request access from the owner.",
      label: "Verify Credential",
      links: {
        actions: [
          {
            label: "Request Access",
            href: `/api/actions/verify/${id}`
          }
        ]
      }
    },
    { headers: corsHeaders }
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { account } = await req.json();

  return NextResponse.json(
    {
      message: `Prepared NomadPass verification request for ${account}.`,
      transaction:
        "DEMO_TRANSACTION_REPLACE_WITH_BASE64_SERIALIZED_SOLANA_TRANSACTION",
      links: {
        next: {
          type: "inline",
          action: {
            type: "completed",
            title: "Access request prepared",
            description: `Credential ${id} is ready for owner-approved sharing.`
          }
        }
      }
    },
    { headers: corsHeaders }
  );
}
