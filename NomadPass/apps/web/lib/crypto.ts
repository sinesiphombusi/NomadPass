function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export async function sha256Base64(input: string | ArrayBuffer) {
  const data =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  const hash = await crypto.subtle.digest("SHA-256", data);
  return bytesToBase64(new Uint8Array(hash));
}

export async function encryptFile(file: File) {
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = await file.arrayBuffer();
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload);
  const exportedKey = await crypto.subtle.exportKey("raw", key);

  return {
    encryptedFile: new File([ciphertext], `${file.name}.enc`, {
      type: "application/octet-stream"
    }),
    iv: bytesToBase64(iv),
    key: bytesToBase64(new Uint8Array(exportedKey)),
    fileHash: await sha256Base64(payload)
  };
}
