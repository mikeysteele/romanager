import { Hono } from "hono";
import { getSettings, upsertSetting } from "../db/queries.ts";
import type { IWorker } from "../worker-adapter.ts";

export const createSettingsRouter = (worker: IWorker) => {
    const settingsRouter = new Hono();

    settingsRouter.get("/", async (c) => {
        const settings = await getSettings();
        return c.json(settings);
    });

    settingsRouter.post("/", async (c) => {
        const body = await c.req.json();
        const { key, value } = body;
        if (!key || !value) return c.json({ error: "Missing key or value" }, 400);
        const result = await upsertSetting(key, value);
        
        // Trigger scan if roms_dir changes
        if (key === 'roms_dir') {
            worker.postMessage({ command: 'scan', path: value });
        }
        
        return c.json(result);
    });

    return settingsRouter;
};
