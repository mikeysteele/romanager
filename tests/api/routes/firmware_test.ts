import { assertEquals } from "@repo/tests/utils/assert";
import { firmwareRouter } from "../../../apps/api/src/routes/firmware.ts";
import { db } from "../../../apps/api/src/db/index.ts";
import { systems, systemFirmware, systemFirmwareFiles } from "../../../apps/api/src/db/schema.ts";
import { eq } from "drizzle-orm";
import { SystemFirmwareSchema } from "@repo/shared";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createZipArchive } from "../../../apps/api/src/zip-util.ts";

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

test("firmwareRouter: rejects firmware paths outside allowed storage roots", async () => {
    const maliciousPayload = {
        id: `fw-exploit-${Date.now()}`,
        systemId: "sys-exploit",
        filename: "shadow",
        path: "/etc/shadow",
    };
    const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(maliciousPayload),
    });
    const res = await firmwareRouter.request(req);
    assertEquals(res.status, 400);
    const json = await res.json();
    assertEquals(json.error.includes("allowed library storage roots"), true);
});

test("firmwareRouter: multi-file firmware registration and child file streaming", async () => {
    const sysId = `test-multifw-sys-${Date.now()}`;
    const fwId = `test-bundle-${Date.now()}`;
    const file1Id = `child-file-1-${Date.now()}`;
    const file2Id = `child-file-2-${Date.now()}`;

    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "fw-multi-test-"));
    const path1 = path.join(tmpDir, "scph39001.bin");
    const path2 = path.join(tmpDir, "scph39001.nvm");

    await fs.writeFile(path1, "BIOS Binary Content 1");
    await fs.writeFile(path2, "NVM Content 2");

    await db.insert(systems).values({
        id: sysId,
        name: "PlayStation 2 Test",
        slug: `ps2-test-${Date.now()}`,
    });

    try {
        const payload = {
            id: fwId,
            systemId: sysId,
            name: "PlayStation 2 BIOS v39001",
            filename: "scph39001.bin",
            path: tmpDir,
            files: [
                {
                    id: file1Id,
                    filename: "scph39001.bin",
                    relPath: "scph39001.bin",
                    path: path1,
                    size: 21,
                },
                {
                    id: file2Id,
                    filename: "scph39001.nvm",
                    relPath: "scph39001.nvm",
                    path: path2,
                    size: 13,
                },
            ],
        };

        const postReq = new Request("http://localhost/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const postRes = await firmwareRouter.request(postReq);
        assertEquals(postRes.status, 200);
        const postJson = await postRes.json();
        assertEquals(postJson.status, "success");
        assertEquals(postJson.firmware.files.length, 2);
        assertEquals(postJson.firmware.name, "PlayStation 2 BIOS v39001");

        // Verify GET / returns firmware with child files
        const getReq = new Request("http://localhost/");
        const getRes = await firmwareRouter.request(getReq);
        assertEquals(getRes.status, 200);
        const allFw = await getRes.json();
        const found = allFw.find((f: any) => f.id === fwId);
        assertEquals(found !== undefined, true);
        assertEquals(found.files.length, 2);

        // Verify streaming file via child file id
        const streamChildReq = new Request(`http://localhost/${file1Id}/file`);
        const streamChildRes = await firmwareRouter.request(streamChildReq);
        assertEquals(streamChildRes.status, 200);
        const streamContent = await streamChildRes.text();
        assertEquals(streamContent, "BIOS Binary Content 1");

        // Verify streaming file via direct files route
        const streamDirectReq = new Request(`http://localhost/files/${file2Id}`);
        const streamDirectRes = await firmwareRouter.request(streamDirectReq);
        assertEquals(streamDirectRes.status, 200);
        assertEquals(await streamDirectRes.text(), "NVM Content 2");

        // Verify DELETE removes both parent and child files from DB
        const delReq = new Request(`http://localhost/${fwId}`, { method: "DELETE" });
        const delRes = await firmwareRouter.request(delReq);
        assertEquals(delRes.status, 200);

        const inDbFw = await db.select().from(systemFirmware).where(eq(systemFirmware.id, fwId)).get();
        assertEquals(inDbFw, undefined);
        const inDbFiles = await db.select().from(systemFirmwareFiles).where(eq(systemFirmwareFiles.firmwareId, fwId));
        assertEquals(inDbFiles.length, 0);
    } finally {
        await fs.rm(tmpDir, { recursive: true, force: true });
        await db.delete(systemFirmwareFiles).where(eq(systemFirmwareFiles.firmwareId, fwId));
        await db.delete(systemFirmware).where(eq(systemFirmware.id, fwId));
        await db.delete(systems).where(eq(systems.id, sysId));
    }
});

test("firmwareRouter: multipart/form-data upload with multiple individual files", async () => {
    const sysId = `test-upload-sys-${Date.now()}`;
    await db.insert(systems).values({
        id: sysId,
        name: "Upload Console",
        slug: `upload-sys-${Date.now()}`,
    });

    let uploadedFwId: string | null = null;
    let uploadedFwPath: string | null = null;
    try {
        const formData = new FormData();
        formData.append("systemId", sysId);
        formData.append("name", "Custom Bundle Name");
        formData.append("description", "Uploaded multi-file firmware");

        const blob1 = new Blob(["BIOS binary content here"], { type: "application/octet-stream" });
        const blob2 = new Blob(["BIOS font content here"], { type: "application/octet-stream" });
        formData.append("files", blob1, "bios.bin");
        formData.append("files", blob2, "font.rom");

        const uploadReq = new Request("http://localhost/upload", {
            method: "POST",
            body: formData,
        });

        const uploadRes = await firmwareRouter.request(uploadReq);
        assertEquals(uploadRes.status, 201);
        const uploadJson = await uploadRes.json();
        assertEquals(uploadJson.status, "success");
        assertEquals(uploadJson.firmware.name, "Custom Bundle Name");
        assertEquals(uploadJson.firmware.files.length, 2);

        uploadedFwId = uploadJson.firmware.id;
        uploadedFwPath = uploadJson.firmware.path;
        const fileNames = uploadJson.firmware.files.map((f: any) => f.filename);
        assertEquals(fileNames.includes("bios.bin"), true);
        assertEquals(fileNames.includes("font.rom"), true);
    } finally {
        if (uploadedFwPath) {
            await fs.rm(path.dirname(uploadedFwPath), { recursive: true, force: true });
        }
        if (uploadedFwId) {
            await db.delete(systemFirmwareFiles).where(eq(systemFirmwareFiles.firmwareId, uploadedFwId));
            await db.delete(systemFirmware).where(eq(systemFirmware.id, uploadedFwId));
        }
        await db.delete(systems).where(eq(systems.id, sysId));
    }
});

test("firmwareRouter: multipart/form-data upload with ZIP archive containing multiple files", async () => {
    const sysId = `test-zip-sys-${Date.now()}`;
    await db.insert(systems).values({
        id: sysId,
        name: "ZIP Console",
        slug: `zip-sys-${Date.now()}`,
    });

    let uploadedFwId: string | null = null;
    let uploadedFwPath: string | null = null;
    try {
        const zipBuffer = createZipArchive([
            { filename: "kickstart31.rom", data: Buffer.from("Amiga Kickstart 3.1 ROM Content") },
            { filename: "kickstart13.rom", data: Buffer.from("Amiga Kickstart 1.3 ROM Content") },
        ]);

        const formData = new FormData();
        formData.append("systemId", sysId);
        formData.append("name", "Amiga Kickstart Bundle");

        const zipBlob = new Blob([zipBuffer], { type: "application/zip" });
        formData.append("files", zipBlob, "amiga-bios.zip");

        const uploadReq = new Request("http://localhost/upload", {
            method: "POST",
            body: formData,
        });

        const uploadRes = await firmwareRouter.request(uploadReq);
        assertEquals(uploadRes.status, 201);
        const uploadJson = await uploadRes.json();
        assertEquals(uploadJson.status, "success");
        assertEquals(uploadJson.firmware.files.length, 2);
        uploadedFwId = uploadJson.firmware.id;
        uploadedFwPath = uploadJson.firmware.path;

        const filenames = uploadJson.firmware.files.map((f: any) => f.filename);
        assertEquals(filenames.includes("kickstart31.rom"), true);
        assertEquals(filenames.includes("kickstart13.rom"), true);
    } finally {
        if (uploadedFwPath) {
            await fs.rm(path.dirname(uploadedFwPath), { recursive: true, force: true });
        }
        if (uploadedFwId) {
            await db.delete(systemFirmwareFiles).where(eq(systemFirmwareFiles.firmwareId, uploadedFwId));
            await db.delete(systemFirmware).where(eq(systemFirmware.id, uploadedFwId));
        }
        await db.delete(systems).where(eq(systems.id, sysId));
    }
});

test("firmwareRouter: upload validation errors", async () => {
    // 1. Missing systemId
    const formData1 = new FormData();
    formData1.append("files", new Blob(["test"]), "file.bin");
    const res1 = await firmwareRouter.request(new Request("http://localhost/upload", { method: "POST", body: formData1 }));
    assertEquals(res1.status, 400);

    // 2. Non-existent systemId
    const formData2 = new FormData();
    formData2.append("systemId", "non-existent-system-9999");
    formData2.append("files", new Blob(["test"]), "file.bin");
    const res2 = await firmwareRouter.request(new Request("http://localhost/upload", { method: "POST", body: formData2 }));
    assertEquals(res2.status, 404);

    // 3. No files uploaded with valid system
    const validSysId = `val-sys-${Date.now()}`;
    await db.insert(systems).values({ id: validSysId, name: "Val Sys", slug: `val-slug-${Date.now()}` });
    try {
        const formData3 = new FormData();
        formData3.append("systemId", validSysId);
        const res3 = await firmwareRouter.request(new Request("http://localhost/upload", { method: "POST", body: formData3 }));
        assertEquals(res3.status, 400);
    } finally {
        await db.delete(systems).where(eq(systems.id, validSysId));
    }
});


