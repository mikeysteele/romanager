import { assertEquals } from "@std/assert";
import { syncRouter } from "../../../apps/api/src/routes/sync.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import {
  devices,
  deviceProfiles,
  profileRules,
  systems,
  games,
  roms,
  romFiles,
} from "../../../apps/api/src/db/schema.ts";
import { createApiKeyRecord } from "../../../apps/api/src/auth.ts";
import { eq } from "drizzle-orm";

Deno.test("syncRouter: file streaming, Range, 304, and device authorization", async () => {
  const testId = Date.now().toString();
  const testFilePath = await Deno.makeTempFile();
  const testContent = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  await Deno.writeTextFile(testFilePath, testContent);

  const sysId = `sys-sync-${testId}`;
  const gameId = `game-sync-${testId}`;
  const romId = `rom-sync-${testId}`;
  const fileId = `file-sync-${testId}`;

  const devAId = `dev-sync-a-${testId}`;
  const devBId = `dev-sync-b-${testId}`;

  try {
    // 1. Setup System with esFolder
    await db.insert(systems).values({
      id: sysId,
      name: `Sync System ${testId}`,
      slug: `sync-sys-${testId}`,
      esFolder: "snes",
    });

    // 2. Setup Game
    await db.insert(games).values({
      id: gameId,
      name: `Sync Game ${testId}`,
      slug: `sync-game-${testId}`,
    });

    // 3. Setup ROM and RomFile
    await db.insert(roms).values({
      id: romId,
      gameId,
      systemId: sysId,
      name: "Sync Test ROM",
      filename: "test.sfc",
      launchFile: "test.sfc",
      path: testFilePath,
      size: testContent.length,
      totalSize: testContent.length,
      setType: "single",
      status: "complete",
      sha1: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
    });

    await db.insert(romFiles).values({
      id: fileId,
      romId,
      relPath: "test.sfc",
      path: testFilePath,
      filename: "test.sfc",
      size: testContent.length,
      sha1: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
      role: "launch",
    });

    // 4. Setup Device A (included) and API key A
    await db.insert(devices).values({
      id: devAId,
      name: "Device A",
      preset: "batocera",
    });
    await db.insert(deviceProfiles).values({
      deviceId: devAId,
      regionPreference: "USA,EUR,JPN",
      oneRomPerGame: false,
      includeFirmware: false,
    });
    const keyA = await createApiKeyRecord("Key A", devAId, "device");

    // 5. Setup Device B (excludes sysId) and API key B
    await db.insert(devices).values({
      id: devBId,
      name: "Device B",
      preset: "batocera",
    });
    await db.insert(deviceProfiles).values({
      deviceId: devBId,
      regionPreference: "USA,EUR,JPN",
      oneRomPerGame: false,
      includeFirmware: false,
    });
    await db.insert(profileRules).values({
      id: `rule-b-${testId}`,
      deviceId: devBId,
      position: 0,
      kind: "exclude_system",
      targetId: sysId,
    });
    const keyB = await createApiKeyRecord("Key B", devBId, "device");

    // Test A: No auth returns 401
    const noAuthReq = new Request(`http://localhost/files/${fileId}`);
    const noAuthRes = await syncRouter.request(noAuthReq);
    assertEquals(noAuthRes.status, 401);

    // Test B: Device B (excluded) returns 403 Forbidden
    const devBReq = new Request(`http://localhost/files/${fileId}`, {
      headers: { Authorization: `Bearer ${keyB.rawKey}` },
    });
    const devBRes = await syncRouter.request(devBReq);
    assertEquals(devBRes.status, 403);

    // Test C: Device A (included) returns 200 and full content
    const devAReq = new Request(`http://localhost/files/${fileId}`, {
      headers: { Authorization: `Bearer ${keyA.rawKey}` },
    });
    const devARes = await syncRouter.request(devAReq);
    assertEquals(devARes.status, 200);
    assertEquals(devARes.headers.get("accept-ranges"), "bytes");
    assertEquals(devARes.headers.get("content-length"), testContent.length.toString());
    const etag = devARes.headers.get("etag");
    assertEquals(etag, '"da39a3ee5e6b4b0d3255bfef95601890afd80709"');
    const text = await devARes.text();
    assertEquals(text, testContent);

    // Test D: Conditional request with If-None-Match returns 304
    const notModReq = new Request(`http://localhost/files/${fileId}`, {
      headers: {
        Authorization: `Bearer ${keyA.rawKey}`,
        "If-None-Match": etag!,
      },
    });
    const notModRes = await syncRouter.request(notModReq);
    assertEquals(notModRes.status, 304);

    // Test E: Range request returns 206 Partial Content
    const rangeReq = new Request(`http://localhost/files/${fileId}`, {
      headers: {
        Authorization: `Bearer ${keyA.rawKey}`,
        Range: "bytes=0-9",
      },
    });
    const rangeRes = await syncRouter.request(rangeReq);
    assertEquals(rangeRes.status, 206);
    assertEquals(rangeRes.headers.get("content-range"), `bytes 0-9/${testContent.length}`);
    assertEquals(rangeRes.headers.get("content-length"), "10");
    const rangeText = await rangeRes.text();
    assertEquals(rangeText, testContent.slice(0, 10));

    // Test F: Invalid Range returns 416
    const invalidRangeReq = new Request(`http://localhost/files/${fileId}`, {
      headers: {
        Authorization: `Bearer ${keyA.rawKey}`,
        Range: `bytes=100-200`,
      },
    });
    const invalidRangeRes = await syncRouter.request(invalidRangeReq);
    assertEquals(invalidRangeRes.status, 416);
  } finally {
    // Cleanup
    await db.delete(romFiles).where(eq(romFiles.id, fileId));
    await db.delete(roms).where(eq(roms.id, romId));
    await db.delete(games).where(eq(games.id, gameId));
    await db.delete(systems).where(eq(systems.id, sysId));
    await db.delete(devices).where(eq(devices.id, devAId));
    await db.delete(devices).where(eq(devices.id, devBId));
    try {
      await Deno.remove(testFilePath);
    } catch {
      // ignore
    }
  }
});
