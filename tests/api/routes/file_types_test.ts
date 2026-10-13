import { assertEquals } from "@repo/tests/utils/assert";
import { fileTypesRouter } from "../../../apps/api/src/routes/fileTypes.ts";
import { FileTypeWhitelistSchema } from "@repo/shared";
import { z } from "zod";

test("GET /api/file-types should return whitelist items conforming to FileTypeWhitelistSchema", async () => {
    const req = new Request("http://localhost/");
    const res = await fileTypesRouter.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(Array.isArray(json), true);
    z.array(FileTypeWhitelistSchema).parse(json);
});

test("POST /api/file-types should reject empty extension", async () => {
    const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extension: "" }),
    });
    const res = await fileTypesRouter.request(req);
    assertEquals(res.status, 400);
});

test("POST /api/file-types should add and DELETE should remove entry conforming to FileTypeWhitelistSchema", async () => {
    // 1. Create
    const createReq = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            extension: "testext",
            magicNumber: "AABBCCDD",
            description: "Test File Type"
        }),
    });
    const createRes = await fileTypesRouter.request(createReq);
    assertEquals(createRes.status, 200);
    const createJson = await createRes.json();
    assertEquals(createJson.status, "success");
    const created = FileTypeWhitelistSchema.parse(createJson.entry);
    const createdId = created.id;
    assertEquals(created.extension, "testext");
    assertEquals(created.magicNumber, "AABBCCDD");

    // 2. Delete
    const deleteReq = new Request(`http://localhost/${createdId}`, {
        method: "DELETE",
    });
    const deleteRes = await fileTypesRouter.request(deleteReq);
    assertEquals(deleteRes.status, 200);
});
