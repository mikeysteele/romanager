import { Hono } from "@hono/hono";
import { streamSSE } from "@hono/hono/streaming";
import { eventBus } from "../sse.ts";

export const eventsRouter = new Hono();

eventsRouter.get("/", (c) => {
    return streamSSE(c, async (stream) => {
        // Send initial connection event
        await stream.writeSSE({
            data: JSON.stringify({ type: 'connected' }),
            event: 'message',
            id: String(Date.now()),
        });

        const listener = async (data: unknown) => {
            await stream.writeSSE({
                data: JSON.stringify(data),
                event: 'message',
                id: String(Date.now()),
            });
        };

        eventBus.on('sse-message', listener);

        // Keep connection alive through proxies
        const heartbeat = setInterval(async () => {
            try {
                await stream.writeSSE({
                    data: JSON.stringify({ type: 'ping' }),
                    event: 'message',
                    id: String(Date.now()),
                });
            } catch {
                clearInterval(heartbeat);
            }
        }, 25000);

        // Wait for the connection to close naturally
        await new Promise<void>((resolve) => {
            stream.onAbort(() => {
                clearInterval(heartbeat);
                eventBus.off('sse-message', listener);
                resolve();
            });
        });
    });
});
