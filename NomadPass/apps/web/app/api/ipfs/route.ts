import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!process.env.PINATA_JWT) {
    const cid = `bafy-demo-${crypto.randomUUID().replaceAll("-", "").slice(0, 24)}`;
    return NextResponse.json({
      cid,
      uri: `ipfs://${cid}`,
      mode: "demo"
    });
  }

  const pinataForm = new FormData();
  pinataForm.append("file", file);

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PINATA_JWT}`
    },
    body: pinataForm
  });

  if (!res.ok) {
    return NextResponse.json({ error: "IPFS upload failed" }, { status: 500 });
  }

  const json = await res.json();
  return NextResponse.json({
    cid: json.IpfsHash,
    uri: `ipfs://${json.IpfsHash}`,
    mode: "pinata"
  });
}
