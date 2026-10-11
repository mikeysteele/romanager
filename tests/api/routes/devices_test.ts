import { assertEquals, assertNotEquals } from "jsr:@std/assert@^0.217.0";
import { devicesRouter } from "../../../apps/api/src/routes/devices.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import {
  devices,

} from "../../../apps/api/src/db/schema.ts";
import { eq } from "drizzle-orm";
import {
  DeviceSchema,
  DeviceProfileSchema,
  ProfileRuleSchema,
  ManifestSchema,
} from "@repo/shared";
import { z } from "zod";

Deno.test("devicesRouter: CRUD and Companion flow with API contract verification", async () => {
  const timestamp = Date.now();
  const devName = `Batocera Handheld ${timestamp}`;

  // 1. Create device via POST /
  const createReq = new Request("http://localhost/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: devName,
      preset: "batocera",
      storageBudgetBytes: 1000000000,
      profile: {
        regionPreference: "USA,EUR,JPN",
        oneRomPerGame: true,
        includeFirmware: false,
      },
    }),
  });
  const createRes = await devicesRouter.request(createReq);
  assertEquals(createRes.status, 201);
  const createData = await createRes.json();

  // Strict API contract validation
  const parsedCreatedDev = DeviceSchema.parse(createData.device);
  const parsedCreatedProfile = DeviceProfileSchema.parse(createData.profile);
  assertEquals(parsedCreatedDev.name, devName);
  assertEquals(parsedCreatedDev.preset, "batocera");
  assertEquals(parsedCreatedProfile.oneRomPerGame, true);
  assertEquals(typeof createData.apiKey.rawKey, "string");
  assertEquals(createData.apiKey.rawKey.startsWith("rmg_"), true);

  const deviceId = createData.device.id;
  const rawKey = createData.apiKey.rawKey;

  try {
    // 2. GET / should include our created device and satisfy z.array(DeviceSchema)
    const listReq = new Request("http://localhost/");
    const listRes = await devicesRouter.request(listReq);
    assertEquals(listRes.status, 200);
    const listData = await listRes.json();
    const parsedDevices = z.array(DeviceSchema).parse(listData);
    const found = parsedDevices.find((d) => d.id === deviceId);
    assertEquals(found !== undefined, true);
    assertEquals(found?.name, devName);

    // 3. GET /:id should return device with profile and rules conforming to DeviceSchema
    const getReq = new Request(`http://localhost/${deviceId}`);
    const getRes = await devicesRouter.request(getReq);
    assertEquals(getRes.status, 200);
    const getData = await getRes.json();
    const parsedGetDev = DeviceSchema.parse(getData);
    assertEquals(parsedGetDev.id, deviceId);
    assertEquals(parsedGetDev.profile?.regionPreference, "USA,EUR,JPN");

    // 4. PUT /:id/rules to set profile rules
    const putRulesReq = new Request(`http://localhost/${deviceId}/rules`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rules: [
          { kind: "include_system", targetId: "snes", position: 0 },
          { kind: "exclude_game", targetId: "bad-game", position: 1 },
        ],
      }),
    });
    const putRulesRes = await devicesRouter.request(putRulesReq);
    assertEquals(putRulesRes.status, 200);
    const rulesData = await putRulesRes.json();
    const parsedRules = z.array(ProfileRuleSchema).parse(rulesData.rules);
    assertEquals(parsedRules.length, 2);

    // 5. Companion endpoint GET /me without auth should fail 401
    const unauthReq = new Request("http://localhost/me");
    const unauthRes = await devicesRouter.request(unauthReq);
    assertEquals(unauthRes.status, 401);

    // 6. Companion endpoint GET /me with valid Bearer key should succeed conforming to DeviceSchema
    const authReq = new Request("http://localhost/me", {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    const authRes = await devicesRouter.request(authReq);
    assertEquals(authRes.status, 200);
    const authData = await authRes.json();
    const parsedAuthDev = DeviceSchema.parse(authData.device);
    assertEquals(parsedAuthDev.id, deviceId);
    assertEquals(authData.serverVersion, "1.0.0");

    // 7. Companion endpoint POST /me/report
    const reportReq = new Request("http://localhost/me/report", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${rawKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agentVersion: "0.1.0",
        freeDiskBytes: 500000000,
        lastSyncSummary: { added: 1, removed: 0 },
      }),
    });
    const reportRes = await devicesRouter.request(reportReq);
    assertEquals(reportRes.status, 200);

    const devInDb = await db.select().from(devices).where(eq(devices.id, deviceId)).get();
    assertEquals(devInDb?.agentVersion, "0.1.0");
    assertNotEquals(devInDb?.lastReport, null);

    // 8. Companion endpoint GET /me/manifest conforming strictly to ManifestSchema
    const manifestReq = new Request("http://localhost/me/manifest", {
      headers: { Authorization: `Bearer ${rawKey}` },
    });
    const manifestRes = await devicesRouter.request(manifestReq);
    assertEquals(manifestRes.status, 200);
    const manifestData = await manifestRes.json();
    const parsedManifest = ManifestSchema.parse(manifestData);
    assertEquals(parsedManifest.deviceId, deviceId);
    assertEquals(typeof parsedManifest.version, "string");
    const etag = manifestRes.headers.get("etag");
    assertNotEquals(etag, null);

    // 9. Conditional GET with If-None-Match should return 304
    const notModifiedReq = new Request("http://localhost/me/manifest", {
      headers: {
        Authorization: `Bearer ${rawKey}`,
        "If-None-Match": etag!,
      },
    });
    const notModifiedRes = await devicesRouter.request(notModifiedReq);
    assertEquals(notModifiedRes.status, 304);

    // 10. Manifest Preview GET /:id/manifest/preview conforming strictly to ManifestSchema
    const previewReq = new Request(`http://localhost/${deviceId}/manifest/preview`);
    const previewRes = await devicesRouter.request(previewReq);
    assertEquals(previewRes.status, 200);
    const previewData = await previewRes.json();
    const parsedPreview = ManifestSchema.parse(previewData);
    assertEquals(parsedPreview.deviceId, deviceId);

    // 11. PATCH /:id updates device name and validates against DeviceSchema
    const patchReq = new Request(`http://localhost/${deviceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${devName} Renamed`,
        profile: {
          oneRomPerGame: false,
        },
      }),
    });
    const patchRes = await devicesRouter.request(patchReq);
    assertEquals(patchRes.status, 200);
    const patchData = await patchRes.json();
    const parsedPatchedDev = DeviceSchema.parse(patchData.device);
    assertEquals(parsedPatchedDev.name, `${devName} Renamed`);
    assertEquals(patchData.profile.oneRomPerGame, false);
  } finally {
    // 12. Cleanup via DELETE /:id
    const deleteReq = new Request(`http://localhost/${deviceId}`, {
      method: "DELETE",
    });
    const deleteRes = await devicesRouter.request(deleteReq);
    assertEquals(deleteRes.status, 200);

    const devCheck = await db.select().from(devices).where(eq(devices.id, deviceId)).get();
    assertEquals(devCheck, undefined);
  }
});
