/// <reference no-default-lib="true" />
/// <reference lib="deno.worker" />

import { scanRoms } from "../scanner.ts";
import "../db/index.ts"; // Keep import to ensure DB init
import type { ScanProgress } from "@repo/shared";

export const commands = {
  SCAN: "scan",
  STOP: "stop",
  STATUS: "status",
}

export type Command = typeof commands[keyof typeof commands];

export type Message = {
  type: "progress" | "done" | "error" | "start";
  [key: string]: unknown;
}

self.onmessage = async (e: MessageEvent) => {
  const { command, path } = e.data;
  
  if (command === commands.SCAN) {
    console.log("[Worker] Starting scan on", path);
    try {
      self.postMessage({ type: 'start' });
      
      const games = await scanRoms(path, (progress: ScanProgress) => {
          self.postMessage({ type: 'progress', ...progress });
      });
      
      self.postMessage({ type: 'done', count: games.length });
    } catch (err) {
      console.error("[Worker] Scan error", err);
      const message = err instanceof Error? err.message : 'Unknown Error'
      self.postMessage({ type: 'error', message });
    }
  }
};
