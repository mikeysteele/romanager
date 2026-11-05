import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker as NodeWorker } from "node:worker_threads";

export interface IWorker {
  postMessage(data: unknown): void;
  onmessage: ((e: { data: any }) => void) | null;
  onerror: ((err: unknown) => void) | null;
  terminate(): void;
}

function resolveWorkerUrl(url: URL | string): URL | string {
  const parsed = typeof url === "string" ? (url.startsWith("file:") ? new URL(url) : null) : url;
  if (!parsed || parsed.protocol !== "file:") {
    return url;
  }

  const filePath = fileURLToPath(parsed);
  if (!fs.existsSync(filePath) && filePath.endsWith(".ts")) {
    const jsPath = filePath.replace(/\.ts$/, ".js");
    if (fs.existsSync(jsPath)) {
      return pathToFileURL(jsPath);
    }
  }
  return parsed;
}

export class UniversalWorker implements IWorker {
  private worker: NodeWorker;
  public onmessage: ((e: { data: any }) => void) | null = null;
  public onerror: ((err: unknown) => void) | null = null;

  constructor(url: URL | string, _options?: unknown) {
    const workerUrl = resolveWorkerUrl(url);
    const isTsSource =
      typeof workerUrl === "string"
        ? workerUrl.endsWith(".ts")
        : workerUrl.pathname.endsWith(".ts");

    this.worker = new NodeWorker(
      workerUrl,
      isTsSource
        ? { execArgv: process.execArgv.includes("--import") ? process.execArgv : ["--import", "tsx"] }
        : {}
    );
    this.worker.on("message", (data) => {
      if (this.onmessage) this.onmessage({ data });
    });
    this.worker.on("error", (err) => {
      if (this.onerror) this.onerror(err);
    });
  }

  postMessage(data: unknown): void {
    this.worker.postMessage(data);
  }

  terminate(): void {
    this.worker.terminate();
  }
}

export function createWorker(moduleUrl: URL | string): IWorker {
  return new UniversalWorker(moduleUrl);
}
