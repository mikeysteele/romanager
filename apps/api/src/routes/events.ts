import { Hono } from "@hono/hono";
import { streamSSE } from "@hono/hono/streaming";
import { eventBus } from "../sse.ts";

export const eventsRouter = new Hono();

eventsRouter.get("/", (c) => {
    return streamSSE(c, async (stream) => {
        const listener = async (data: unknown) => {
            await stream.writeSSE({
                data: JSON.stringify(data),
                event: 'update',
                id: String(Date.now()),
            });
        };

        eventBus.on('sse-message', listener);

        // Wait for the connection to close naturally
        await new Promise<void>((resolve) => {
            stream.onAbort(() => {
                eventBus.off('sse-message', listener);
                resolve();
            });
        });
    });
});
