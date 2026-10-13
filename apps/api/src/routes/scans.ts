import { Hono } from "hono";
import { db } from "../db/index.ts";
import { scannedFiles } from "../db/schema.ts";
import { getSettings } from "../db/queries.ts";
import type { IWorker } from "../worker-adapter.ts";

export const createScansRouter = (worker: IWorker, romsDir: string) => {
    const scansRouter = new Hono();

    scansRouter.get("/", async (c) => {
        const scans = await db.select().from(scannedFiles);
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
