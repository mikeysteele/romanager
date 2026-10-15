import { assertEquals } from "@repo/tests/utils/assert";
import { EventBus } from "../../../apps/api/src/sse.ts";

test("eventBus: does not throw or abort when sync listener throws", () => {
  const bus = new EventBus();
  let secondCalled = false;

  bus.on("test-event", () => {
    throw new Error("Deliberate sync error in listener");
  });

  bus.on("test-event", () => {
    secondCalled = true;
  });

  // Should catch internally and continue executing subsequent listeners
  bus.emit("test-event", { data: 123 });
  assertEquals(secondCalled, true);
});

test("eventBus: handles async listener rejection gracefully", async () => {
  const bus = new EventBus();
  let secondCalled = false;

  bus.on("async-event", async () => {
    throw new Error("Deliberate async rejection");
  });

  bus.on("async-event", () => {
    secondCalled = true;
  });

  bus.emit("async-event", { data: "abc" });
  assertEquals(secondCalled, true);

  // Give microtasks a tick to verify no unhandled rejection crashes the process
  await new Promise((resolve) => setTimeout(resolve, 20));
});
