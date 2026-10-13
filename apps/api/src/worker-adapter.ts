import { Worker as NodeWorker } from "node:worker_threads";

export interface IWorker {
  postMessage(data: unknown): void;
  onmessage: ((e: { data: any }) => void) | null;
  onerror: ((err: unknown) => void) | null;
  terminate(): void;
}

export class UniversalWorker implements IWorker {
  private worker: NodeWorker;
  public onmessage: ((e: { data: any }) => void) | null = null;
  public onerror: ((err: unknown) => void) | null = null;

  constructor(url: URL | string) {
    this.worker = new NodeWorker(url);
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
  if (typeof Worker !== "undefined") {
    return new Worker(moduleUrl, { type: "module" }) as unknown as IWorker;
  }
  return new UniversalWorker(moduleUrl);
}
