import { assertEquals } from "@std/assert";

Deno.test("deletion.worker: deletes temp file and blocks protected paths", async () => {
    const worker = new Worker(
        new URL("../../../apps/api/src/workers/deletion.worker.ts", import.meta.url).href,
        { type: "module" }
    );

    try {
        // 1. Create a safe temporary file to delete
        const tempFile = await Deno.makeTempFile();
        await Deno.writeTextFile(tempFile, "sample data to delete");

        // Verify file exists
        const statBefore = await Deno.stat(tempFile);
        assertEquals(statBefore.isFile, true);

        // 2. Dispatch deletion with temp file and protected path
        const messagePromise = new Promise<{ type: string; id: string }>((resolve) => {
            worker.onmessage = (e) => {
                resolve(e.data);
            };
        });

        worker.postMessage({
            type: "DELETE_ROM",
            id: "rom-test-delete",
            paths: [tempFile, "/etc/fake-protected-path", "/"]
        });

        const reply = await messagePromise;
        assertEquals(reply, { type: "ROM_DELETED", id: "rom-test-delete" });

        // 3. Verify temp file was removed
        let exists = true;
        try {
            await Deno.stat(tempFile);
        } catch (e) {
            if (e instanceof Deno.errors.NotFound) {
                exists = false;
            }
        }
        assertEquals(exists, false);
    } finally {
        worker.terminate();
    }
});
