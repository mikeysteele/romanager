import "./env.ts";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { readFile, stat } from "node:fs/promises";
import { eventBus } from "./sse.ts";
import { webdav } from "./webdav.ts";
import { createWorker } from "./worker-adapter.ts";

// Import modular routers
import { gamesRouter } from "./routes/games.ts";
import { systemsRouter } from "./routes/systems.ts";
import { romsRouter } from "./routes/roms.ts";
import { createScansRouter } from "./routes/scans.ts";
import { importRouter } from "./routes/import.ts";
import { createSettingsRouter } from "./routes/settings.ts";
import { metadataRouter } from "./routes/metadata.ts";
import { eventsRouter } from "./routes/events.ts";
import { unmappedRouter } from "./routes/unmapped.ts";
import { firmwareRouter } from "./routes/firmware.ts";
import { fileTypesRouter } from "./routes/fileTypes.ts";
import { filesystemRouter } from "./routes/filesystem.ts";
import { devicesRouter } from "./routes/devices.ts";
import { syncRouter } from "./routes/sync.ts";
import { keysRouter } from "./routes/keys.ts";

export default function createServer(romsDir: string, appDir: string) {
    const app = new Hono();

    app.use("/*", cors());

    // Initialize Worker
    const worker = createWorker(new URL("./workers/scanner.ts", import.meta.url));
    worker.onmessage = (e) => {
        const msg = e.data;
        if (msg.type === 'start' || msg.type === 'progress' || msg.type === 'done' || msg.type === 'error') {
            eventBus.emit('sse-message', msg);
        }
    };

    // Mount WebDAV
    webdav(app, romsDir);

    // API Routes mapping
    app.get("/api/health", (c) => c.json({ status: "ok" }));
    app.route("/api/events", eventsRouter);
    app.route("/api/games", gamesRouter);
    app.route("/api/systems", systemsRouter);
    app.route("/api/platforms", systemsRouter);
    app.route("/api/roms", romsRouter);
    app.route("/api/scans", createScansRouter(worker, romsDir));
    app.route("/api/scan", createScansRouter(worker, romsDir)); // The POST runs here too
    app.route("/api/import", importRouter);
    app.route("/api/settings", createSettingsRouter(worker));
    app.route("/api/metadata", metadataRouter);
    app.route("/api/unmapped", unmappedRouter);
    app.route("/api/firmware", firmwareRouter);
    app.route("/api/file-types", fileTypesRouter);
    app.route("/api/filesystem", filesystemRouter);
    app.route("/api/devices", devicesRouter);
    app.route("/api/sync", syncRouter);
    app.route("/api/keys", keysRouter);

    // Content-Type mapping for SPA assets
    const getContentType = (p: string) => {
        if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript";
        if (p.endsWith(".css")) return "text/css";
        if (p.endsWith(".html")) return "text/html";
        if (p.endsWith(".json")) return "application/json";
        if (p.endsWith(".svg")) return "image/svg+xml";
        if (p.endsWith(".png")) return "image/png";
        if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
        if (p.endsWith(".wasm")) return "application/wasm";
        if (p.endsWith(".woff2")) return "font/woff2";
        return "application/octet-stream";
    };

    // Serve frontend SPA
    app.use("/*", async (c, next) => {
        const filePath = `${appDir}${c.req.path}`;
        try {
            const fileStat = await stat(filePath);
            if (fileStat.isDirectory()) {
                const indexPath = filePath.endsWith("/") ? `${filePath}index.html` : `${filePath}/index.html`;
                const data = await readFile(indexPath);
                return c.body(data, 200, { "Content-Type": "text/html" });
            }
            const data = await readFile(filePath);
            return c.body(data, 200, { "Content-Type": getContentType(filePath) });
        } catch {
            // SPA fallback to index.html
            try {
                const indexPath = `${appDir}/index.html`;
                const data = await readFile(indexPath);
                return c.body(data, 200, { "Content-Type": "text/html" });
            } catch {
                return next();
            }
        }
    });

    return app;
}
