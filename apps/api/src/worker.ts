import { db } from "./db/index.ts";
import { roms } from "./db/schema.ts";
import { eq } from "drizzle-orm";

let deletionWorker: Worker | null = null;

export function getDeletionWorker(): Worker {
    if (!deletionWorker) {
        deletionWorker = new Worker(
            new URL("./workers/deletion.worker.ts", import.meta.url).href,
            { type: "module" }
        );

        deletionWorker.onmessage = async (e) => {
            const { type, id } = e.data;

            try {
                if (type === 'ROM_DELETED') {
                    await db.delete(roms).where(eq(roms.id, id));
                    console.log(`[Main] Finalized DB deletion for ROM ${id}`);
                    globalThis.dispatchEvent(new CustomEvent('roms-updated'));
                } else if (type === 'GAME_DELETED') {
                    console.log(`[Main] Background file deletion finished for Game ${id}`);
                }
            } catch (err) {
                console.error(`[Main] Failed to finalize DB deletion for ${type} ${id}`, err);
            }
        };

        deletionWorker.onerror = (e) => {
            console.error("[Main] Deletion worker error:", e);
        };
    }
    return deletionWorker;
}
