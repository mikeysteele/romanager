import { db } from "./db/index.ts";
import { roms, romFiles } from "./db/schema.ts";
import { eq } from "drizzle-orm";
import { eventBus } from "./sse.ts";

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
                    await db.delete(romFiles).where(eq(romFiles.romId, id));
                    await db.delete(roms).where(eq(roms.id, id));
                    console.log(`[Main] Finalized DB deletion for ROM ${id}`);
                    eventBus.emit('sse-message', { type: 'done', action: 'rom-deleted', id });
                } else if (type === 'GAME_DELETED') {
                    console.log(`[Main] Background file deletion finished for Game ${id}`);
                    eventBus.emit('sse-message', { type: 'done', action: 'game-deleted', id });
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
