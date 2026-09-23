import { assertEquals } from "jsr:@std/assert";
import { fileTypesRouter } from "../../../apps/api/src/routes/fileTypes.ts";

Deno.test("GET /api/file-types should return whitelist items", async () => {
    const req = new Request("http://localhost/");
    const res = await fileTypesRouter.request(req);
    assertEquals(res.status, 200);
    const json = await res.json();
    assertEquals(Array.isArray(json), true);
});

Deno.test("POST /api/file-types should reject empty extension", async () => {
    const req = new Request("http://localhost/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extension: "" }),
    });
    const res = await fileTypesRouter.request(req);
    assertEquals(res.status, 400);
});

Deno.test("POST /api/file-types should add and DELETE should remove entry", async () => {
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
    const createdId = createJson.entry.id;
    assertEquals(createJson.entry.extension, "testext");
    assertEquals(createJson.entry.magicNumber, "AABBCCDD");

    // 2. Delete
    const deleteReq = new Request(`http://localhost/${createdId}`, {
        method: "DELETE",
    });
    const deleteRes = await fileTypesRouter.request(deleteReq);
    assertEquals(deleteRes.status, 200);
});
