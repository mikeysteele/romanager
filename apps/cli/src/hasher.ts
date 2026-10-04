import { createHash } from "node:crypto";

export async function calculateFileSha1(filePath: string): Promise<string> {
  const file = await Deno.open(filePath, { read: true });
  const hasher = createHash("sha1");
  const buffer = new Uint8Array(64 * 1024);

  try {
    while (true) {
      const bytesRead = await file.read(buffer);
      if (bytesRead === null || bytesRead === 0) break;
      hasher.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    file.close();
  }

  return hasher.digest("hex");
}
