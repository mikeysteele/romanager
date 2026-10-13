import { assertEquals } from "@repo/tests/utils/assert";
import { firmwareRouter } from "../../../apps/api/src/routes/firmware.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import { systems, systemFirmware } from "../../../apps/api/src/db/schema.ts";
import { eq } from "drizzle-orm";
import { SystemFirmwareSchema } from "@repo/shared";
import { z } from "zod";

test("firmwareRouter: CRUD operations and SystemFirmwareSchema contract validation", async () => {
    const sysId = `test-fw-sys-${Date.now()}`;
    const fwId = `test-fw-${Date.now()}`;
    const fwPath = `/tmp/bios-${Date.now()}.bin`;

    // 1. Setup system
    await db.insert(systems).values({
        id: sysId,
        name: "Firmware Test Console",
        slug: `fw-sys-${Date.now()}`
    });

    try {
        // 2. POST / with invalid payload should return 400
        const invalidReq = new Request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: "incomplete" })
        });
        const invalidRes = await firmwareRouter.request(invalidReq);
        assertEquals(invalidRes.status, 400);

        // 3. POST / with valid payload conforming to SystemFirmwareSchema
        const validPayload = {
            id: fwId,
            systemId: sysId,
            filename: "bios.bin",
            description: "System BIOS",
            path: fwPath,
            md5: "0123456789abcdef0123456789abcdef",
            crc32: "12345678",
        };
        const postReq = new Request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(validPayload)
        });
        const postRes = await firmwareRouter.request(postReq);
        assertEquals(postRes.status, 200);
        const postJson = await postRes.json();
        assertEquals(postJson.status, "success");
        const createdFw = SystemFirmwareSchema.parse(postJson.firmware);
        assertEquals(createdFw.id, fwId);
        assertEquals(createdFw.systemId, sysId);

        // 4. GET / should return array complying with SystemFirmwareSchema
        const getReq = new Request("http://localhost/");
        const getRes = await firmwareRouter.request(getReq);
        assertEquals(getRes.status, 200);
        const getJson = await getRes.json();
        const firmwareList = z.array(SystemFirmwareSchema).parse(getJson);
        const found = firmwareList.find(f => f.id === fwId);
        assertEquals(found !== undefined, true);
        assertEquals(found?.filename, "bios.bin");

        // 5. Duplicate path POST / should return 409
        const dupReq = new Request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...validPayload, id: `other-${Date.now()}` })
        });
        const dupRes = await firmwareRouter.request(dupReq);
        assertEquals(dupRes.status, 409);

        // 6. DELETE /:id removes the firmware
        const delReq = new Request(`http://localhost/${fwId}`, { method: "DELETE" });
        const delRes = await firmwareRouter.request(delReq);
        assertEquals(delRes.status, 200);

        // Verify gone
        const inDb = await db.select().from(systemFirmware).where(eq(systemFirmware.id, fwId)).get();
        assertEquals(inDb, undefined);
    } finally {
        await db.delete(systemFirmware).where(eq(systemFirmware.id, fwId));
        await db.delete(systems).where(eq(systems.id, sysId));
    }
});
