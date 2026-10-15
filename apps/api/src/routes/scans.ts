import { Hono } from "hono";
import { db } from "../db/index.ts";
import { scannedFiles } from "../db/schema.ts";
import { getSettings } from "../db/queries.ts";
import type { IWorker } from "../worker-adapter.ts";

export const createScansRouter = (worker: IWorker, romsDir: string) => {
    const scansRouter = new Hono();

    scansRouter.get("/", async (c) => {
        const limitParam = c.req.query("limit");
        const offsetParam = c.req.query("offset");
        let query = db.select().from(scannedFiles).orderBy(scannedFiles.filename, scannedFiles.id);

        if (limitParam) {
            const parsedLimit = parseInt(limitParam, 10);
            if (!isNaN(parsedLimit) && parsedLimit > 0) {
                const limit = Math.min(parsedLimit, 500);
                query = query.limit(limit) as typeof query;
                if (offsetParam) {
                    const parsedOffset = parseInt(offsetParam, 10);
                    if (!isNaN(parsedOffset) && parsedOffset > 0) {
                        query = query.offset(parsedOffset) as typeof query;
                    }
                }
            }
        }

        const scans = await query;
        return c.json(scans);
    });

    scansRouter.post("/", async (c) => {
        const body = await c.req.json().catch(() => ({}));
        let path = body.path;
        if (!path) {
             const settings = await getSettings();
             const romDirSetting = settings.find(s => s.key === 'roms_dir');
             path = romDirSetting ? romDirSetting.value : romsDir;
        }
        
        // Dispatch to worker
        worker.postMessage({ command: 'scan', path });
        
        return c.json({ status: 'started' });
    });

    return scansRouter;
};
