import { loadConfig } from "../config.ts";
import { runSync } from "./sync.ts";

export interface WatchOptions {
  configPath?: string;
  poll?: string; // e.g. "15m", "30s"
  quiet?: boolean;
}

export async function runWatch(options: WatchOptions): Promise<void> {
  const config = await loadConfig(options.configPath);
  console.log(`[Watch] Starting companion daemon for device ${config.deviceId}...`);
  console.log(`[Watch] Server: ${config.server}`);

  // 1. Initial sync on startup
  try {
    console.log("[Watch] Performing initial sync on startup...");
    await runSync({ configPath: options.configPath, quiet: options.quiet });
  } catch (e) {
    console.error(`[Watch] Initial sync encountered an error: ${e}`);
  }

  // 2. Determine poll interval (default: 15 minutes)
  const pollMs = parseDuration(options.poll || "15m");
  console.log(`[Watch] Periodic fallback polling every ${Math.round(pollMs / 60000)} minute(s).`);

  let isSyncing = false;
  let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  const triggerSync = (reason: string) => {
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
    }
    syncDebounceTimer = setTimeout(async () => {
      if (isSyncing) {
        console.log(`[Watch] Sync already in progress, queuing after completion (${reason})...`);
        return;
      }
      isSyncing = true;
      try {
        console.log(`[Watch] Triggering sync (${reason})...`);
        await runSync({ configPath: options.configPath, quiet: options.quiet });
      } catch (e) {
        console.error(`[Watch] Sync error: ${e}`);
      } finally {
        isSyncing = false;
      }
    }, 2000);
  };

  // 3. Fallback interval polling
  const pollTimer = setInterval(() => {
    triggerSync("periodic poll");
  }, pollMs);

  // 4. SSE event stream listener
  const sseUrl = `${config.server.replace(/\/+$/, "")}/api/devices/me/events`;
  let shouldRun = true;

  const handleShutdown = () => {
    console.log("\n[Watch] Shutting down daemon...");
    shouldRun = false;
    clearInterval(pollTimer);
    if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
    process.exit(0);
  };

  try {
    process.on("SIGINT", handleShutdown);
    process.on("SIGTERM", handleShutdown);
  } catch {
    // signal listener not supported on some platforms
  }

  while (shouldRun) {
    try {
      console.log(`[Watch] Connecting to server event stream at ${sseUrl}...`);
      const res = await fetch(sseUrl, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: "text/event-stream",
        },
      });

      if (!res.ok) {
        throw new Error(`SSE endpoint returned status ${res.status}`);
      }

      console.log("[Watch] Connected to real-time event stream.");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body for SSE");

      const decoder = new TextDecoder();
      let buffer = "";

      while (shouldRun) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: manifest-changed")) {
            console.log("[Watch] Received 'manifest-changed' notification from server!");
            triggerSync("server event");
          }
        }
      }
    } catch (e) {
      if (!shouldRun) break;
      console.warn(`[Watch] Event stream disconnected (${e}). Reconnecting in 5 seconds...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

function parseDuration(str: string): number {
  const match = str.match(/^(\d+)([smhd])?$/);
  if (!match) return 15 * 60 * 1000;
  const val = parseInt(match[1], 10);
  const unit = match[2] || "m";
  switch (unit) {
    case "s":
      return val * 1000;
    case "m":
      return val * 60 * 1000;
    case "h":
      return val * 60 * 60 * 1000;
    case "d":
      return val * 24 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000;
  }
}
