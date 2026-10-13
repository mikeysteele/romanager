import { parentPort } from "node:worker_threads";
import { scanRoms } from "../scanner.ts";
import "../db/index.ts"; // Keep import to ensure DB init
import type { ScanProgress } from "@repo/shared";

export const commands = {
  SCAN: "scan",
  STOP: "stop",
  STATUS: "status",
};

export type Command = typeof commands[keyof typeof commands];

export type Message = {
  type: "progress" | "done" | "error" | "start";
  [key: string]: unknown;
};

export async function handleScannerCommand(
  data: { command: string; path: string },
  postMsg: (msg: Message) => void
): Promise<void> {
  const { command, path } = data;

  if (command === commands.SCAN) {
    console.log("[Worker] Starting scan on", path);
    try {
      postMsg({ type: 'start' });

      const games = await scanRoms(path, (progress: ScanProgress) => {
        postMsg({ type: 'progress', ...progress });
      });

      postMsg({ type: 'done', count: games.length });
    } catch (err) {
      console.error("[Worker] Scan error", err);
      const message = err instanceof Error ? err.message : 'Unknown Error';
      postMsg({ type: 'error', message });
    }
  }
}

if (parentPort) {
  parentPort.on("message", (data: { command: string; path: string }) => {
    handleScannerCommand(data, (msg) => parentPort!.postMessage(msg));
  });
} else if (typeof self !== "undefined") {
  (self as unknown as { onmessage: (e: { data: { command: string; path: string } }) => void; postMessage: (msg: unknown) => void }).onmessage = async (e) => {
    handleScannerCommand(e.data, (msg) => (self as unknown as { postMessage: (msg: unknown) => void }).postMessage(msg));
  };
}
