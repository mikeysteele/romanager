import { assertEquals, assertNotEquals } from "@repo/tests/utils/assert";
import { keysRouter } from "../../../apps/api/src/routes/keys.ts";
import { verifyApiKey } from "../../../apps/api/src/auth.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import { apiKeys } from "../../../apps/api/src/db/schema.ts";
import { eq } from "drizzle-orm";

test("keysRouter: list, create, and revoke API keys", async () => {
  const keyName = `Test Script Key ${Date.now()}`;

  // 1. Create key
  const createReq = new Request("http://localhost/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: keyName,
      scope: "admin",
    }),
  });
  const createRes = await keysRouter.request(createReq);
  assertEquals(createRes.status, 201);
  const keyData = await createRes.json();
  assertEquals(keyData.name, keyName);
  assertEquals(keyData.scope, "admin");
  assertEquals(typeof keyData.rawKey, "string");
  assertEquals(keyData.rawKey.startsWith("rmg_"), true);

  const keyId = keyData.id;
  const rawKey = keyData.rawKey;

  try {
    // 2. List keys should include keyId but NEVER include keyHash or rawKey
    const listReq = new Request("http://localhost/");
    const listRes = await keysRouter.request(listReq);
    assertEquals(listRes.status, 200);
    const listData = await listRes.json() as Array<{ id: string; rawKey?: string; keyHash?: string; prefix?: string }>;
    const found = listData.find((k) => k.id === keyId);
    assertEquals(found !== undefined, true);
    if (!found) throw new Error("Key not found in list");
    assertEquals(found.rawKey, undefined);
    assertEquals(found.keyHash, undefined);
    assertEquals(found.prefix, rawKey.slice(0, 8));

    // 3. Verify key is valid
    const verified = await verifyApiKey(rawKey);
    assertNotEquals(verified, null);
    assertEquals(verified?.id, keyId);

    // 4. Revoke key via DELETE /:id
    const deleteReq = new Request(`http://localhost/${keyId}`, {
      method: "DELETE",
    });
    const deleteRes = await keysRouter.request(deleteReq);
    assertEquals(deleteRes.status, 200);
    const deleteData = await deleteRes.json();
    assertEquals(deleteData.status, "success");

    // 5. Verify key is now invalid
    const verifiedAfterRevoke = await verifyApiKey(rawKey);
    assertEquals(verifiedAfterRevoke, null);
  } finally {
    // Cleanup
    await db.delete(apiKeys).where(eq(apiKeys.id, keyId));
  }
});
