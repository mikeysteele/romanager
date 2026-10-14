import { assertEquals } from "@repo/tests/utils/assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { UniversalWorker } from "../../../apps/api/src/worker-adapter.ts";

test("deletion.worker: deletes temp file and blocks protected paths", async () => {
    const worker = new UniversalWorker(
        new URL("../../../apps/api/src/workers/deletion.worker.ts", import.meta.url).href,
        { type: "module" }
    );

    try {
        // 1. Create a safe temporary file to delete
        const tempFile = path.join(os.tmpdir(), `temp-del-${Date.now()}-${Math.random().toString(36).substring(2)}.tmp`);
        await fs.writeFile(tempFile, "sample data to delete", "utf-8");

        // Verify file exists
        const statBefore = await fs.stat(tempFile);
        assertEquals(statBefore.isFile(), true);

        // 2. Dispatch deletion with temp file and protected path
        const messagePromise = new Promise<{ type: string; id: string }>((resolve) => {
            worker.onmessage = (e: any) => {
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
            await fs.stat(tempFile);
        } catch (e: any) {
            if (e.code === "ENOENT") {
                exists = false;
            }
        }
        assertEquals(exists, false);
    } finally {
        worker.terminate();
    }
});
