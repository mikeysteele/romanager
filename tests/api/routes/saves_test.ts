import { assertEquals } from "@std/assert";
import { devicesRouter } from "../../../apps/api/src/routes/devices.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import { devices, deviceProfiles } from "../../../apps/api/src/db/schema.ts";
import { createApiKeyRecord } from "../../../apps/api/src/auth.ts";
import { eq } from "drizzle-orm";
import { createHash } from "node:crypto";

Deno.test("saves: upload, versioning, deduplication, and restore", async () => {
  const testId = `save-${Date.now()}`;
  const devId = `dev-${testId}`;

  // 1. Setup Device & Key
  await db.insert(devices).values({
    id: devId,
    name: "Save Test Device",
    preset: "batocera",
  });
  await db.insert(deviceProfiles).values({
    deviceId: devId,
    regionPreference: "USA",
  });
  const apiKey = await createApiKeyRecord("Save Key", devId, "device");

  const saveContent1 = "SAVE DATA V1 - MARIO LVL 1";
  const sha1_v1 = createHash("sha1").update(saveContent1).digest("hex");

  const saveContent2 = "SAVE DATA V2 - MARIO LVL 99";
  const sha1_v2 = createHash("sha1").update(saveContent2).digest("hex");

  try {
    // 2. Initial list should be empty
    const listReq = new Request("http://localhost/me/saves", {
      headers: { Authorization: `Bearer ${apiKey.rawKey}` },
    });
    const listRes = await devicesRouter.request(listReq);
    assertEquals(listRes.status, 200);
    const listData = await listRes.json();
    assertEquals(listData.length, 0);

    // 3. Upload V1
    const putV1Req = new Request("http://localhost/me/saves/snes/smw.srm", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey.rawKey}`,
        "Content-Type": "application/octet-stream",
        "X-Sha1": sha1_v1,
        "X-Mtime": new Date().toISOString(),
      },
      body: saveContent1,
    });
    const putV1Res = await devicesRouter.request(putV1Req);
    assertEquals(putV1Res.status, 201);
    const putV1Data = await putV1Res.json();
    assertEquals(putV1Data.status, "uploaded");
    assertEquals(putV1Data.sha1, sha1_v1);
    const v1Id = putV1Data.versionId;

    // 4. Duplicate upload of V1 should return "unchanged" without new version
    const putDupReq = new Request("http://localhost/me/saves/snes/smw.srm", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey.rawKey}`,
        "Content-Type": "application/octet-stream",
        "X-Sha1": sha1_v1,
      },
      body: saveContent1,
    });
    const putDupRes = await devicesRouter.request(putDupReq);
    assertEquals(putDupRes.status, 200);
    const putDupData = await putDupRes.json();
    assertEquals(putDupData.status, "unchanged");

    // 5. Upload V2
    const putV2Req = new Request("http://localhost/me/saves/snes/smw.srm", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${apiKey.rawKey}`,
        "Content-Type": "application/octet-stream",
        "X-Sha1": sha1_v2,
        "X-Mtime": new Date().toISOString(),
      },
      body: saveContent2,
    });
    const putV2Res = await devicesRouter.request(putV2Req);
    assertEquals(putV2Res.status, 201);
    const putV2Data = await putV2Res.json();
    assertEquals(putV2Data.status, "uploaded");

    // 6. List saves should now show 1 save file with 2 versions
    const listReq2 = new Request("http://localhost/me/saves", {
      headers: { Authorization: `Bearer ${apiKey.rawKey}` },
    });
    const listRes2 = await devicesRouter.request(listReq2);
    assertEquals(listRes2.status, 200);
    const listData2 = await listRes2.json();
    assertEquals(listData2.length, 1);
    assertEquals(listData2[0].relativePath, "snes/smw.srm");
    assertEquals(listData2[0].versionsCount, 2);
    assertEquals(listData2[0].currentSha1, sha1_v2);

    // 7. Download latest (V2)
    const getLatestReq = new Request("http://localhost/me/saves/snes/smw.srm", {
      headers: { Authorization: `Bearer ${apiKey.rawKey}` },
    });
    const getLatestRes = await devicesRouter.request(getLatestReq);
    assertEquals(getLatestRes.status, 200);
    assertEquals(await getLatestRes.text(), saveContent2);

    // 8. Download specific version (V1)
    const getV1Req = new Request(`http://localhost/me/saves/snes/smw.srm?version=${v1Id}`, {
      headers: { Authorization: `Bearer ${apiKey.rawKey}` },
    });
    const getV1Res = await devicesRouter.request(getV1Req);
    assertEquals(getV1Res.status, 200);
    assertEquals(await getV1Res.text(), saveContent1);
  } finally {
    // Cleanup
    await db.delete(devices).where(eq(devices.id, devId));
  }
});
