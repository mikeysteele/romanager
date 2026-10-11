import { assertEquals } from "jsr:@std/assert@^0.217.0";
import { eventsRouter } from "../../../apps/api/src/routes/events.ts";
import { eventBus } from "../../../apps/api/src/sse.ts";

Deno.test("eventsRouter: GET / establishes SSE stream and receives initial connection event", async () => {
    const req = new Request("http://localhost/");
    const res = await eventsRouter.request(req);
    assertEquals(res.status, 200);
    assertEquals(res.headers.get("content-type")?.includes("text/event-stream"), true);

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body reader");

    const decoder = new TextDecoder();
    
    // First message should be connected event
    const chunk1 = await reader.read();
    const text1 = decoder.decode(chunk1.value);
    assertEquals(text1.includes('{"type":"connected"}'), true);

    // Broadcast an event and read it
    setTimeout(() => {
        eventBus.emit("sse-message", { type: "test-broadcast", message: "hello" });
    }, 10);

    const chunk2 = await reader.read();
    const text2 = decoder.decode(chunk2.value);
    assertEquals(text2.includes("test-broadcast"), true);

    // Cancel reader to trigger onAbort cleanup
    await reader.cancel();
});
